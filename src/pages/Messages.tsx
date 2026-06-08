import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
} from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
  Edit3,
  Heart,
  ImagePlus,
  Loader2,
  Reply,
  SendHorizonal,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { db, storage } from "../firebaseData";
import { useNicknames } from "../context/NicknameContext";
import { useRole } from "../context/RoleContext";
import { usePaginatedMessages } from "../hooks/usePaginatedMessages";
import { formatTime, toDate } from "../lib/date";
import { optimizeImage } from "../lib/image";
import type {
  Message,
  MessageReply,
  PresenceStatus,
  Role,
  TypingStatus,
} from "../types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Page } from "../components/Page";
import { useRealtimeDoc } from "../hooks/useRealtimeDoc";

const TYPING_IDLE_TIMEOUT_MS = 2_000;
const TYPING_HEARTBEAT_MS = 4_000;
const TYPING_STALE_TIMEOUT_MS = 8_000;
const PRESENCE_HEARTBEAT_MS = 30_000;
const PRESENCE_STALE_TIMEOUT_MS = 75_000;
const MESSAGE_LONG_PRESS_MS = 450;
const ACTION_MENU_WIDTH = 224;
const ACTION_MENU_ESTIMATED_HEIGHT = 220;
const ACTION_MENU_MARGIN = 12;
const ACTION_MENU_GAP = 8;
const REACTION_OPTIONS = ["❤️", "😂", "😍", "🥺"] as const;

const getPartnerRole = (role: Role): Role => (role === "me" ? "her" : "me");

const getReplyPreviewText = (
  message: Pick<MessageReply, "text" | "imageUrl">
) => message.text || (message.imageUrl ? "Photo" : "Message");

const createReplySnapshot = (message: Message): MessageReply => ({
  id: message.id,
  text: message.deletedAt ? "Message deleted" : message.text.slice(0, 280),
  from: message.from,
  imageUrl: message.deletedAt ? null : message.imageUrl ?? null,
});

type TypingIndicatorProps = {
  name: string;
};

type ActionMenuPosition = {
  top: number;
  left: number;
};

const TypingIndicator = memo(function TypingIndicator({
  name,
}: TypingIndicatorProps) {
  return (
    <div className="flex justify-start">
      <div className="rounded-[1.25rem] rounded-bl-sm border border-rose-100/50 bg-white/90 px-4 py-2.5 text-rose-500 shadow-md shadow-rose-200/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{name} is typing</span>
          <span className="flex items-end gap-1" aria-hidden="true">
            <span className="size-1.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-rose-400" />
          </span>
        </div>
      </div>
    </div>
  );
});

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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeActionMessageId, setActiveActionMessageId] = useState<
    string | null
  >(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);
  const [pendingReplyScrollId, setPendingReplyScrollId] = useState<
    string | null
  >(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const typingIdleTimeoutRef = useRef<number | null>(null);
  const messageLongPressTimeoutRef = useRef<number | null>(null);
  const pendingReplyLoadRef = useRef(false);
  const replyJumpInProgressRef = useRef(false);
  const messageHighlightTimeoutRef = useRef<number | null>(null);
  const replyScrollFrameRef = useRef<number | null>(null);
  const presenceHeartbeatRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const publishedTypingRef = useRef(false);
  const lastTypingWriteAtRef = useRef(0);
  const initialScrollDone = useRef(false);
  const prevMessageCount = useRef(0);
  const {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    loadUntilMessage,
  } = usePaginatedMessages();
  const activeActionMessage = activeActionMessageId
    ? messages.find((message) => message.id === activeActionMessageId) ?? null
    : null;
  const partnerRole = role ? getPartnerRole(role) : null;
  const { data: partnerTypingStatus } = useRealtimeDoc<TypingStatus>(
    "typingStatus",
    partnerRole ?? "me",
    Boolean(partnerRole)
  );
  const { data: partnerPresenceStatus } = useRealtimeDoc<PresenceStatus>(
    "presenceStatus",
    partnerRole ?? "me",
    Boolean(partnerRole)
  );
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [partnerIsOnline, setPartnerIsOnline] = useState(false);

  const clearTypingIdleTimer = useCallback(() => {
    if (typingIdleTimeoutRef.current !== null) {
      window.clearTimeout(typingIdleTimeoutRef.current);
      typingIdleTimeoutRef.current = null;
    }
  }, []);

  const clearMessageLongPressTimer = useCallback(() => {
    if (messageLongPressTimeoutRef.current !== null) {
      window.clearTimeout(messageLongPressTimeoutRef.current);
      messageLongPressTimeoutRef.current = null;
    }
  }, []);

  const closeMessageActions = useCallback(() => {
    setActiveActionMessageId(null);
    setActionMenuPosition(null);
  }, []);

  const clearMessageHighlightTimer = useCallback(() => {
    if (messageHighlightTimeoutRef.current !== null) {
      window.clearTimeout(messageHighlightTimeoutRef.current);
      messageHighlightTimeoutRef.current = null;
    }
  }, []);

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const target = messageRefs.current.get(messageId);
      const container = scrollContainerRef.current;

      if (!target || !container) {
        return false;
      }

      replyJumpInProgressRef.current = true;
      if (replyScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(replyScrollFrameRef.current);
      }

      replyScrollFrameRef.current = window.requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const top =
          container.scrollTop +
          targetRect.top -
          containerRect.top -
          (container.clientHeight - targetRect.height) / 2;

        container.scrollTo({
          top: Math.max(0, top),
          behavior: "smooth",
        });
        setHighlightedMessageId(messageId);
        replyScrollFrameRef.current = null;
      });

      clearMessageHighlightTimer();
      messageHighlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null);
        replyJumpInProgressRef.current = false;
      }, 1_800);

      return true;
    },
    [clearMessageHighlightTimer]
  );

  const handleReplyPreviewClick = useCallback(
    (event: MouseEvent, messageId: string) => {
      event.stopPropagation();
      closeMessageActions();

      if (scrollToMessage(messageId)) {
        return;
      }

      replyJumpInProgressRef.current = true;
      setPendingReplyScrollId(messageId);
    },
    [closeMessageActions, scrollToMessage]
  );

  const openMessageActions = useCallback(
    (message: Message, target: Element) => {
      if (message.deletedAt) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const preferredLeft =
        message.from === role ? rect.right - ACTION_MENU_WIDTH : rect.left;
      const left = Math.min(
        window.innerWidth - ACTION_MENU_WIDTH - ACTION_MENU_MARGIN,
        Math.max(ACTION_MENU_MARGIN, preferredLeft)
      );

      setActiveActionMessageId(message.id);
      setActionMenuPosition({
        top: Math.max(
          ACTION_MENU_MARGIN,
          Math.min(
            rect.bottom + ACTION_MENU_GAP,
            window.innerHeight -
              ACTION_MENU_ESTIMATED_HEIGHT -
              ACTION_MENU_MARGIN
          )
        ),
        left,
      });
    },
    [role]
  );

  const handleMessagePointerDown = useCallback(
    (event: PointerEvent, message: Message) => {
      if (event.button !== 0 || message.deletedAt) {
        return;
      }

      longPressTriggeredRef.current = false;
      clearMessageLongPressTimer();
      const target = event.currentTarget;
      messageLongPressTimeoutRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        openMessageActions(message, target);
      }, MESSAGE_LONG_PRESS_MS);
    },
    [clearMessageLongPressTimer, openMessageActions]
  );

  const handleMessagePointerEnd = useCallback(() => {
    clearMessageLongPressTimer();
  }, [clearMessageLongPressTimer]);

  const handleMessageContextMenu = useCallback(
    (event: MouseEvent, message: Message) => {
      event.preventDefault();
      clearMessageLongPressTimer();
      openMessageActions(message, event.currentTarget);
    },
    [clearMessageLongPressTimer, openMessageActions]
  );

  const publishTypingStatus = useCallback(
    async (isTyping: boolean, force = false) => {
      if (!role) {
        return;
      }

      const now = Date.now();
      if (!force) {
        if (isTyping) {
          const recentlyPublished =
            publishedTypingRef.current &&
            now - lastTypingWriteAtRef.current < TYPING_HEARTBEAT_MS;

          if (recentlyPublished) {
            return;
          }
        } else if (!publishedTypingRef.current) {
          return;
        }
      }

      publishedTypingRef.current = isTyping;
      lastTypingWriteAtRef.current = now;

      try {
        await setDoc(
          doc(db, "typingStatus", role),
          {
            role,
            isTyping,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Typing presence is best-effort and should never block composing.
      }
    },
    [role]
  );

  const publishPresenceStatus = useCallback(
    async (isOnline: boolean) => {
      if (!role) {
        return;
      }

      try {
        await setDoc(
          doc(db, "presenceStatus", role),
          {
            role,
            isOnline,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Presence is best-effort; stale timestamps handle missed disconnects.
      }
    },
    [role]
  );

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

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextText = event.target.value;
      setText(nextText);
      clearTypingIdleTimer();

      if (!nextText.trim()) {
        void publishTypingStatus(false, true);
        return;
      }

      void publishTypingStatus(true);
      typingIdleTimeoutRef.current = window.setTimeout(() => {
        void publishTypingStatus(false, true);
      }, TYPING_IDLE_TIMEOUT_MS);
    },
    [clearTypingIdleTimer, publishTypingStatus]
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

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => textInputRef.current?.focus());
  }, []);

  const startReply = useCallback(
    (message: Message) => {
      setReplyingTo(message);
      setEditingMessage(null);
      closeMessageActions();
      focusComposer();
    },
    [closeMessageActions, focusComposer]
  );

  const startEdit = useCallback(
    (message: Message) => {
      if (message.deletedAt) {
        return;
      }

      clearImage();
      setReplyingTo(null);
      setEditingMessage(message);
      setText(message.text);
      closeMessageActions();
      focusComposer();
    },
    [clearImage, closeMessageActions, focusComposer]
  );

  const cancelComposerMode = useCallback(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setText("");
  }, []);

  const handleReaction = useCallback(
    async (message: Message, reaction: string) => {
      if (!role || message.deletedAt) {
        return;
      }

      const nextReactions: Partial<Record<Role, string>> = {
        ...(message.reactions ?? {}),
      };

      if (nextReactions[role] === reaction) {
        delete nextReactions[role];
      } else {
        nextReactions[role] = reaction;
      }

      try {
        await updateDoc(doc(db, "messages", message.id), {
          reactions: nextReactions,
        });
        closeMessageActions();
      } catch (reactionError) {
        toast.error(
          reactionError instanceof Error
            ? reactionError.message
            : "Reaction could not be saved."
        );
      }
    },
    [closeMessageActions, role]
  );

  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      if (!role || message.from !== role || message.deletedAt) {
        return;
      }

      if (!window.confirm("Delete this message?")) {
        return;
      }

      try {
        await updateDoc(doc(db, "messages", message.id), {
          text: "",
          deletedAt: serverTimestamp(),
          deletedBy: role,
        });

        if (editingMessage?.id === message.id) {
          setEditingMessage(null);
          setText("");
        }

        if (replyingTo?.id === message.id) {
          setReplyingTo(null);
        }

        closeMessageActions();
      } catch (deleteError) {
        toast.error(
          deleteError instanceof Error
            ? deleteError.message
            : "Message could not be deleted."
        );
      }
    },
    [closeMessageActions, editingMessage?.id, replyingTo?.id, role]
  );

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
    publishedTypingRef.current = false;
    lastTypingWriteAtRef.current = 0;

    return () => {
      clearTypingIdleTimer();

      if (role && publishedTypingRef.current) {
        void setDoc(
          doc(db, "typingStatus", role),
          {
            role,
            isTyping: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    };
  }, [clearTypingIdleTimer, role]);

  useEffect(
    () => () => {
      clearMessageLongPressTimer();
      clearMessageHighlightTimer();

      if (replyScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(replyScrollFrameRef.current);
      }
    },
    [clearMessageHighlightTimer, clearMessageLongPressTimer]
  );

  useEffect(() => {
    if (!activeActionMessageId) {
      return;
    }

    window.addEventListener("resize", closeMessageActions);

    return () => window.removeEventListener("resize", closeMessageActions);
  }, [activeActionMessageId, closeMessageActions]);

  useLayoutEffect(() => {
    if (!pendingReplyScrollId) {
      return;
    }

    if (scrollToMessage(pendingReplyScrollId)) {
      pendingReplyLoadRef.current = false;
      setPendingReplyScrollId(null);
      return;
    }
  }, [messages, pendingReplyScrollId, scrollToMessage]);

  useEffect(() => {
    if (!pendingReplyScrollId) {
      return;
    }

    if (messageRefs.current.has(pendingReplyScrollId)) {
      return;
    }

    if (hasMore && !loadingMore && !pendingReplyLoadRef.current) {
      pendingReplyLoadRef.current = true;

      void loadUntilMessage(pendingReplyScrollId)
        .then((found) => {
          if (!found) {
            replyJumpInProgressRef.current = false;
            setPendingReplyScrollId(null);
            toast.error("Original message could not be found.");
          }
        })
        .finally(() => {
          pendingReplyLoadRef.current = false;
        });
      return;
    }

    if (!hasMore && !loadingMore && !pendingReplyLoadRef.current) {
      replyJumpInProgressRef.current = false;
      setPendingReplyScrollId(null);
      toast.error("Original message could not be found.");
    }
  }, [hasMore, loadUntilMessage, loadingMore, pendingReplyScrollId]);

  useEffect(() => {
    if (!role) {
      return;
    }

    void publishPresenceStatus(true);
    presenceHeartbeatRef.current = window.setInterval(() => {
      void publishPresenceStatus(true);
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      if (presenceHeartbeatRef.current !== null) {
        window.clearInterval(presenceHeartbeatRef.current);
        presenceHeartbeatRef.current = null;
      }

      void publishPresenceStatus(false);
    };
  }, [publishPresenceStatus, role]);

  useEffect(() => {
    if (
      !partnerRole ||
      partnerTypingStatus?.role !== partnerRole ||
      !partnerTypingStatus.isTyping ||
      !partnerTypingStatus.updatedAt
    ) {
      setPartnerIsTyping(false);
      return;
    }

    const updatedAtMs = toDate(partnerTypingStatus.updatedAt).getTime();
    const timeUntilStale = TYPING_STALE_TIMEOUT_MS - (Date.now() - updatedAtMs);

    if (timeUntilStale <= 0) {
      setPartnerIsTyping(false);
      return;
    }

    setPartnerIsTyping(true);
    const timeoutId = window.setTimeout(
      () => setPartnerIsTyping(false),
      timeUntilStale
    );

    return () => window.clearTimeout(timeoutId);
  }, [partnerRole, partnerTypingStatus]);

  useEffect(() => {
    if (
      !partnerRole ||
      partnerPresenceStatus?.role !== partnerRole ||
      !partnerPresenceStatus.isOnline ||
      !partnerPresenceStatus.updatedAt
    ) {
      setPartnerIsOnline(false);
      return;
    }

    const updatedAtMs = toDate(partnerPresenceStatus.updatedAt).getTime();
    const timeUntilStale =
      PRESENCE_STALE_TIMEOUT_MS - (Date.now() - updatedAtMs);

    if (timeUntilStale <= 0) {
      setPartnerIsOnline(false);
      return;
    }

    setPartnerIsOnline(true);
    const timeoutId = window.setTimeout(
      () => setPartnerIsOnline(false),
      timeUntilStale
    );

    return () => window.clearTimeout(timeoutId);
  }, [partnerPresenceStatus, partnerRole]);

  useEffect(() => {
    if (messages.length === 0) return;

    if (replyJumpInProgressRef.current || pendingReplyScrollId) {
      prevMessageCount.current = messages.length;
      return;
    }

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

  useEffect(() => {
    if (!partnerIsTyping) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [partnerIsTyping]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      closeMessageActions();

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
    [closeMessageActions, hasMore, loadMore, loadingMore]
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

      const trimmedText = text.trim();
      const hasText = trimmedText.length > 0;
      const hasImage = selectedImage !== null;

      if (editingMessage) {
        if (!role || editingMessage.from !== role || !hasText) {
          return;
        }

        setSending(true);

        try {
          await updateDoc(doc(db, "messages", editingMessage.id), {
            text: trimmedText,
            editedAt: serverTimestamp(),
            editedBy: role,
          });
          setEditingMessage(null);
          setText("");
          clearTypingIdleTimer();
          void publishTypingStatus(false, true);
        } catch (editError) {
          toast.error(
            editError instanceof Error
              ? editError.message
              : "Message could not be edited."
          );
        } finally {
          setSending(false);
        }

        return;
      }

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
          text: trimmedText,
          from: role,
          createdAt: serverTimestamp(),
          seenByMe: role === "me",
          seenByHer: role === "her",
          ...(replyingTo ? { replyTo: createReplySnapshot(replyingTo) } : {}),
          ...(imageData ?? {}),
        });
        setText("");
        setReplyingTo(null);
        clearTypingIdleTimer();
        void publishTypingStatus(false, true);
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
    [
      clearImage,
      clearTypingIdleTimer,
      editingMessage,
      publishTypingStatus,
      replyingTo,
      role,
      selectedImage,
      text,
      uploadImage,
    ]
  );

  return (
    <Page
      eyebrow="Realtime chat"
      title="Messages"
      description="Send the thoughts that should not wait."
    >
      <section className="glass-card flex h-[calc(100vh-13rem)] min-h-[32rem] flex-col overflow-hidden rounded-[2rem]">
        <div className="flex items-center justify-between gap-4 border-b border-white/70 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-rose-950">Private room</p>
            <p className="text-xs text-rose-600/70">
              {role
                ? `Writing as ${getNickname(role)}`
                : "Unlocked for two hearts"}
            </p>
          </div>
          {partnerRole ? (
            <div className="flex items-center gap-2 rounded-full bg-white/65 px-3 py-1.5 text-xs font-bold text-rose-700">
              <span
                className={`size-2 rounded-full ${
                  partnerIsOnline ? "bg-emerald-400" : "bg-rose-200"
                }`}
              />
              <span>
                {getNickname(partnerRole)} is{" "}
                {partnerIsOnline ? "online" : "offline"}
              </span>
            </div>
          ) : null}
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
          ) : (
            <div className="grid gap-3">
              {loadingMore ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="size-5 animate-spin text-rose-400" />
                </div>
              ) : null}
              {messages.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="No messages yet ❤️"
                  description="Start with something tiny, sweet, or wonderfully random."
                />
              ) : null}
              {messages.map((message) => {
                const isMine = message.from === role;
                const isDeleted = Boolean(message.deletedAt);
                const seenByOther =
                  message.from === "me" ? message.seenByHer : message.seenByMe;
                const reactions = Object.entries(
                  message.reactions ?? {}
                ).filter(
                  (entry): entry is [Role, string] =>
                    entry[0] === "me" || entry[0] === "her"
                );
                const hasImage = Boolean(message.imageUrl && !isDeleted);

                return (
                  <div
                    key={message.id}
                    ref={(element) => {
                      if (element) {
                        messageRefs.current.set(message.id, element);
                      } else {
                        messageRefs.current.delete(message.id);
                      }
                    }}
                    className={`flex rounded-[1.75rem] transition ${
                      isMine ? "justify-end" : "justify-start"
                    } ${
                      highlightedMessageId === message.id
                        ? "bg-amber-100/70"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex max-w-[80%] flex-col ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-full rounded-[1.25rem] ${
                          isMine
                            ? "rounded-br-sm bg-gradient-to-br from-rose-500 via-rose-500 to-pink-500 text-white shadow-lg shadow-rose-400/25"
                            : "rounded-bl-sm border border-rose-100/50 bg-white/90 text-rose-950 shadow-md shadow-rose-200/20 backdrop-blur-sm"
                        } ${
                          hasImage ? "overflow-hidden" : "px-4 py-2.5"
                        } select-none`}
                        onPointerDown={(event) =>
                          handleMessagePointerDown(event, message)
                        }
                        onPointerUp={handleMessagePointerEnd}
                        onPointerCancel={handleMessagePointerEnd}
                        onPointerLeave={handleMessagePointerEnd}
                        onContextMenu={(event) =>
                          handleMessageContextMenu(event, message)
                        }
                      >
                        {message.replyTo && !isDeleted ? (
                          <button
                            type="button"
                            onClick={(event) =>
                              handleReplyPreviewClick(
                                event,
                                message.replyTo!.id
                              )
                            }
                            className={`rounded-2xl border-l-4 px-3 py-2 text-xs ${
                              isMine
                                ? "border-white/55 bg-white/15 text-white/85"
                                : "border-rose-300 bg-rose-50 text-rose-700"
                            } ${
                              hasImage
                                ? "w-full"
                                : "-mx-4 -mt-2.5 mb-2 w-[calc(100%+2rem)]"
                            } block text-left [font:inherit]`}
                          >
                            <p className="text-xs font-bold">
                              Replying to {getNickname(message.replyTo.from)}
                            </p>
                            <p className="line-clamp-2 text-xs">
                              {getReplyPreviewText(message.replyTo)}
                            </p>
                          </button>
                        ) : null}
                        {hasImage ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (longPressTriggeredRef.current) {
                                longPressTriggeredRef.current = false;
                                return;
                              }

                              setFullscreenImage(message.imageUrl!);
                            }}
                            className="block w-full"
                          >
                            <img
                              src={message.imageUrl}
                              alt="Shared image"
                              className="max-h-64 w-full object-cover"
                            />
                          </button>
                        ) : null}
                        {isDeleted ? (
                          <p className="text-[0.9rem] italic leading-relaxed opacity-70">
                            Message deleted
                          </p>
                        ) : message.text ? (
                          <p
                            className={`whitespace-pre-wrap text-[0.9rem] leading-relaxed ${
                              hasImage ? "px-4 pt-2.5" : ""
                            }`}
                          >
                            {message.text}
                          </p>
                        ) : null}
                        <div
                          className={`flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide ${
                            isMine ? "text-white/70" : "text-rose-400/80"
                          } ${hasImage ? "px-4 pb-2.5 pt-1" : "mt-1"}`}
                        >
                          <span>{formatTime(message.createdAt)}</span>
                          {message.editedAt && !isDeleted ? (
                            <span className="opacity-90">• Edited</span>
                          ) : null}
                          {isMine ? (
                            <span className="opacity-90">
                              • {seenByOther ? "Seen" : "Sent"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {reactions.length > 0 ? (
                        <div
                          className={`-mt-2 flex gap-1 rounded-full bg-white/90 px-2 py-1 text-sm shadow-sm ${
                            isMine ? "mr-3" : "ml-3"
                          }`}
                        >
                          {reactions.map(([reactionRole, reaction]) => (
                            <span
                              key={reactionRole}
                              title={getNickname(reactionRole)}
                            >
                              {reaction}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {partnerIsTyping && partnerRole ? (
                <TypingIndicator name={getNickname(partnerRole)} />
              ) : null}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {editingMessage ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/70 bg-white/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">
                Editing
              </p>
              <p className="truncate text-sm font-semibold text-rose-800">
                {editingMessage.text}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelComposerMode}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600"
              aria-label="Cancel edit"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : replyingTo ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/70 bg-white/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">
                Replying to {getNickname(replyingTo.from)}
              </p>
              <p className="truncate text-sm font-semibold text-rose-800">
                {getReplyPreviewText(replyingTo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600"
              aria-label="Cancel reply"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

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
            disabled={imageProcessing || Boolean(editingMessage)}
            className="shrink-0 text-rose-700 disabled:opacity-50"
            aria-label="Add image"
          >
            <ImagePlus size={28} />
          </button>
          <input
            ref={textInputRef}
            value={text}
            onChange={handleTextChange}
            placeholder={
              editingMessage
                ? "Edit your message..."
                : replyingTo
                ? "Write a reply..."
                : "Write something sweet..."
            }
            className="min-w-0 flex-1 rounded-full border border-rose-100 bg-white/85 px-4 py-3 text-sm text-rose-950 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
          />
          <Button
            type="submit"
            disabled={
              sending ||
              imageProcessing ||
              (editingMessage ? !text.trim() : !text.trim() && !selectedImage)
            }
            className="size-14 shrink-0 p-0"
            aria-label="Send message"
          >
            <SendHorizonal className="size-9 stroke-[3]" />
          </Button>
        </form>
      </section>

      {activeActionMessage &&
      actionMenuPosition &&
      !activeActionMessage.deletedAt ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={closeMessageActions}
            aria-label="Close message actions"
          />
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-3xl border border-rose-100 bg-white/95 p-2 text-rose-800 shadow-xl shadow-rose-200/30 backdrop-blur"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-1 rounded-full bg-rose-50 px-2 py-1">
              {REACTION_OPTIONS.map((reaction) => {
                const selected =
                  activeActionMessage.reactions?.[role ?? "me"] === reaction;

                return (
                  <button
                    key={reaction}
                    type="button"
                    onClick={() =>
                      handleReaction(activeActionMessage, reaction)
                    }
                    className={`grid size-9 place-items-center rounded-full text-lg transition ${
                      selected
                        ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                        : "hover:bg-white"
                    }`}
                    aria-label={`React with ${reaction}`}
                  >
                    {reaction}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => startReply(activeActionMessage)}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-rose-50"
              >
                <Reply className="size-4" />
                Reply
              </button>
              {activeActionMessage.from === role ? (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(activeActionMessage)}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-rose-50"
                  >
                    <Edit3 className="size-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(activeActionMessage)}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={closeMessageActions}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-rose-400 hover:bg-rose-50"
              >
                <X className="size-4" />
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : null}

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
