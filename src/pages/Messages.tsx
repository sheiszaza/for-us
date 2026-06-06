import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type UIEvent,
} from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { Heart, ImagePlus, Loader2, SendHorizonal, X } from "lucide-react";
import toast from "react-hot-toast";
import { db, storage } from "../firebaseData";
import { useNicknames } from "../context/NicknameContext";
import { useRole } from "../context/RoleContext";
import { usePaginatedMessages } from "../hooks/usePaginatedMessages";
import { formatTime } from "../lib/date";
import { optimizeImage } from "../lib/image";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Page } from "../components/Page";

export function Messages() {
  const { role } = useRole();
  const { getNickname } = useNicknames();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialScrollDone = useRef(false);
  const prevMessageCount = useRef(0);
  const { messages, loading, loadingMore, error, hasMore, loadMore } =
    usePaginatedMessages();

  const handleImageSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (event.target) {
        event.target.value = "";
      }
      if (!file) {
        return;
      }

      setImageProcessing(true);
      try {
        const optimized = await optimizeImage(file);
        setSelectedImage(optimized);
        const previewUrl = URL.createObjectURL(optimized);

        const canPreview = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = previewUrl;
        });

        setImagePreview(canPreview ? previewUrl : "pending");
        if (!canPreview) {
          URL.revokeObjectURL(previewUrl);
        }
      } catch {
        toast.error("Could not process image.");
      } finally {
        setImageProcessing(false);
      }
    },
    []
  );

  const clearImage = useCallback(() => {
    if (imagePreview && imagePreview !== "pending") {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    setImageProcessing(false);
    setUploadProgress(null);
  }, [imagePreview]);

  const uploadImage = useCallback(async (image: File) => {
    const imagePath = `messages/${Date.now()}-${image.name.replace(
      /\s+/g,
      "-"
    )}`;
    const uploadRef = ref(storage, imagePath);
    const task = uploadBytesResumable(uploadRef, image);

    return new Promise<{ imageUrl: string; imagePath: string }>(
      (resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) =>
            setUploadProgress(
              Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              )
            ),
          reject,
          async () => {
            const imageUrl = await getDownloadURL(task.snapshot.ref);
            resolve({ imageUrl, imagePath });
          }
        );
      }
    );
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    if (!initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      initialScrollDone.current = true;
      prevMessageCount.current = messages.length;
      return;
    }

    const newMessagesAdded = messages.length > prevMessageCount.current;
    const addedAtEnd =
      newMessagesAdded &&
      scrollContainerRef.current &&
      scrollContainerRef.current.scrollHeight -
        scrollContainerRef.current.scrollTop -
        scrollContainerRef.current.clientHeight <
        150;

    if (addedAtEnd) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      if (target.scrollTop < 100 && hasMore && !loadingMore) {
        const prevScrollHeight = target.scrollHeight;
        loadMore().then(() => {
          requestAnimationFrame(() => {
            target.scrollTop = target.scrollHeight - prevScrollHeight;
          });
        });
      }
    },
    [hasMore, loadMore, loadingMore]
  );

  useEffect(() => {
    if (!role || messages.length === 0) {
      return;
    }

    const seenField = role === "me" ? "seenByMe" : "seenByHer";
    const unseen = messages.filter(
      (message) => message.from !== role && !message[seenField]
    );

    unseen.forEach((message) => {
      void updateDoc(doc(db, "messages", message.id), { [seenField]: true });
    });
  }, [messages, role]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const hasText = text.trim().length > 0;
      const hasImage = selectedImage !== null;

      if (!role || (!hasText && !hasImage)) {
        return;
      }

      setSending(true);

      try {
        let imageData: { imageUrl: string; imagePath: string } | null = null;

        if (selectedImage) {
          imageData = await uploadImage(selectedImage);
        }

        await addDoc(collection(db, "messages"), {
          text: text.trim(),
          from: role,
          createdAt: serverTimestamp(),
          seenByMe: role === "me",
          seenByHer: role === "her",
          ...(imageData ?? {}),
        });
        setText("");
        clearImage();
      } catch (sendError) {
        toast.error(
          sendError instanceof Error
            ? sendError.message
            : "Message could not be sent."
        );
      } finally {
        setSending(false);
        setUploadProgress(null);
      }
    },
    [clearImage, role, selectedImage, text, uploadImage]
  );

  return (
    <Page
      eyebrow="Realtime chat"
      title="Messages"
      description="Send the thoughts that should not wait."
    >
      <section className="glass-card flex h-[calc(100vh-13rem)] min-h-[32rem] flex-col overflow-hidden rounded-[2rem]">
        <div className="border-b border-white/70 px-5 py-4">
          <p className="text-sm font-bold text-rose-950">Private room</p>
          <p className="text-xs text-rose-600/70">
            {role
              ? `Writing as ${getNickname(role)}`
              : "Unlocked for two hearts"}
          </p>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="soft-scrollbar flex-1 overflow-y-auto px-4 py-5"
        >
          {loading ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className={`h-14 w-2/3 animate-pulse rounded-[1.5rem] bg-rose-100 ${
                    item % 2 ? "ml-auto" : ""
                  }`}
                />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No messages yet ❤️"
              description="Start with something tiny, sweet, or wonderfully random."
            />
          ) : (
            <div className="grid gap-3">
              {loadingMore ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="size-5 animate-spin text-rose-400" />
                </div>
              ) : null}
              {messages.map((message) => {
                const isMine = message.from === role;
                const seenByOther =
                  message.from === "me" ? message.seenByHer : message.seenByMe;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                            <div
                              className={`max-w-[80%] rounded-[1.25rem] ${
                                isMine
                                  ? "rounded-br-sm bg-gradient-to-br from-rose-500 via-rose-500 to-pink-500 text-white shadow-lg shadow-rose-400/25"
                                  : "rounded-bl-sm border border-rose-100/50 bg-white/90 text-rose-950 shadow-md shadow-rose-200/20 backdrop-blur-sm"
                              } ${message.imageUrl ? "overflow-hidden" : "px-4 py-2.5"}`}
                            >
                              {message.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setFullscreenImage(message.imageUrl!)}
                                  className="block w-full"
                                >
                                  <img
                                    src={message.imageUrl}
                                    alt="Shared image"
                                    className="max-h-64 w-full object-cover"
                                  />
                                </button>
                              ) : null}
                              {message.text ? (
                                <p
                                  className={`whitespace-pre-wrap text-[0.9rem] leading-relaxed ${
                                    message.imageUrl ? "px-4 pt-2.5" : ""
                                  }`}
                                >
                                  {message.text}
                                </p>
                              ) : null}
                              <div
                                className={`flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide ${
                                  isMine ? "text-white/70" : "text-rose-400/80"
                                } ${
                                  message.imageUrl
                                    ? "px-4 pb-2.5 pt-1"
                                    : "mt-1"
                                }`}
                              >
                                <span>{formatTime(message.createdAt)}</span>
                                {isMine ? (
                                  <span className="opacity-90">• {seenByOther ? "Seen" : "Sent"}</span>
                                ) : null}
                              </div>
                            </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {imageProcessing ? (
          <div className="flex items-center gap-2 border-t border-white/70 bg-white/55 px-3 py-3">
            <div className="grid h-24 w-24 place-items-center rounded-2xl bg-rose-100">
              <Loader2 className="size-6 animate-spin text-rose-400" />
            </div>
            <span className="text-sm text-rose-600">Processing image...</span>
          </div>
        ) : imagePreview ? (
          <div className="relative border-t border-white/70 bg-white/55 px-3 pt-3">
            {imagePreview === "pending" ? (
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-rose-100">
                <ImagePlus className="size-8 text-rose-400" />
              </div>
            ) : (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-24 w-24 rounded-2xl object-cover"
              />
            )}
            <button
              type="button"
              onClick={clearImage}
              className="absolute left-[5.5rem] top-5 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md"
              aria-label="Remove image"
            >
              <X className="size-4" />
            </button>
            {uploadProgress !== null ? (
              <div className="absolute bottom-1 left-3 right-3 h-1.5 w-[5.5rem] overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className={`flex gap-2 border-white/70 bg-white/55 p-3 ${
            imagePreview || imageProcessing ? "" : "border-t"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageProcessing}
            className="shrink-0 text-rose-700 disabled:opacity-50"
            aria-label="Add image"
          >
            <ImagePlus size={28} />
          </button>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write something sweet..."
            className="min-w-0 flex-1 rounded-full border border-rose-100 bg-white/85 px-4 py-3 text-sm text-rose-950 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
          />
          <Button
            type="submit"
            disabled={sending || imageProcessing || (!text.trim() && !selectedImage)}
            className="size-14 shrink-0 p-0"
            aria-label="Send message"
          >
            <SendHorizonal className="size-9 stroke-[3]" />
          </Button>
        </form>
      </section>

      {fullscreenImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="size-6" />
          </button>
          <img
            src={fullscreenImage}
            alt="Full size"
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </Page>
  );
}
