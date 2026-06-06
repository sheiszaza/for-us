import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  Clock,
  Crosshair,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Page } from "../components/Page";
import { useNicknames } from "../context/NicknameContext";
import { useRole } from "../context/RoleContext";
import { db } from "../firebaseData";
import { useRealtimeCollection } from "../hooks/useRealtimeCollection";
import type { FirestoreDate, LiveLocation, Role } from "../types";

const DEFAULT_CENTER: [number, number] = [20, 0];
const LOCATION_WRITE_INTERVAL_MS = 10_000;
const LOCATION_HEARTBEAT_MS = 30_000;
const LOCATION_STALE_MS = 2 * 60_000;

const markerIcons: Record<Role, L.DivIcon> = {
  me: L.divIcon({
    className: "",
    html: '<div class="grid size-11 place-items-center rounded-full border-4 border-white bg-rose-500 text-xs font-black text-white shadow-lg shadow-rose-500/30">Me</div>',
    iconAnchor: [22, 22],
    iconSize: [44, 44],
    popupAnchor: [0, -22],
  }),
  her: L.divIcon({
    className: "",
    html: '<div class="grid size-11 place-items-center rounded-full border-4 border-white bg-fuchsia-500 text-xs font-black text-white shadow-lg shadow-fuchsia-500/30">Her</div>',
    iconAnchor: [22, 22],
    iconSize: [44, 44],
    popupAnchor: [0, -22],
  }),
};

const getPartnerRole = (role: Role): Role => (role === "me" ? "her" : "me");

const getMillis = (value?: FirestoreDate | null) => {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : value.toMillis();
};

const isLocationFresh = (location: LiveLocation) => {
  const updatedAt = getMillis(location.updatedAt);
  return updatedAt !== null && Date.now() - updatedAt < LOCATION_STALE_MS;
};

const formatLastUpdated = (value?: FirestoreDate | null) => {
  const updatedAt = getMillis(value);

  if (!updatedAt) {
    return "Not shared yet";
  }

  const diff = Date.now() - updatedAt;

  if (diff < 15_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 60 * 60_000) return `${Math.round(diff / 60_000)}m ago`;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(updatedAt));
};

const getLocationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission is blocked. Enable it from your browser site settings.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your device could not find a location right now.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Try again with a better signal.";
  }

  return error.message || "Could not read your location.";
};

function FitMapToLocations({ locations }: { locations: LiveLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView(DEFAULT_CENTER, 2);
      return;
    }

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 15, {
        animate: true,
      });
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [location.latitude, location.longitude])
    );
    map.fitBounds(bounds, {
      animate: true,
      maxZoom: 15,
      padding: [32, 32],
    });
  }, [locations, map]);

  return null;
}

function LocationStatusCard({
  label,
  location,
}: {
  label: string;
  location: LiveLocation | undefined;
}) {
  const fresh = location ? isLocationFresh(location) : false;
  const status =
    location?.sharing && fresh ? "Live" : location ? "Paused" : "Waiting";

  return (
    <Card className="h-full">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-500">
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-rose-950">{label}</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] ${
                status === "Live"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-500"
              }`}
            >
              {status}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-rose-700/75">
            {location
              ? `Updated ${formatLastUpdated(location.updatedAt)}${
                  typeof location.accuracy === "number"
                    ? ` · about ${Math.round(location.accuracy)}m accuracy`
                    : ""
                }`
              : "No shared location yet."}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function Location() {
  const { role } = useRole();
  const { getNickname } = useNicknames();
  const [starting, setStarting] = useState(false);
  const [watching, setWatching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    PermissionState | "unknown"
  >("unknown");
  const watchIdRef = useRef<number | null>(null);
  const heartbeatIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);
  const lastWriteAtRef = useRef(0);
  const sharingRef = useRef(false);
  const locationConstraints = useMemo(() => [orderBy("updatedAt", "desc")], []);
  const {
    data: locations,
    loading,
    error,
  } = useRealtimeCollection<LiveLocation>("locations", locationConstraints);
  const partnerRole = role ? getPartnerRole(role) : null;
  const currentLocation = role
    ? locations.find((location) => location.id === role)
    : undefined;
  const partnerLocation = partnerRole
    ? locations.find((location) => location.id === partnerRole)
    : undefined;
  const displayedLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          typeof location.latitude === "number" &&
          typeof location.longitude === "number"
      ),
    [locations]
  );
  const canUseLocation =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "geolocation" in navigator &&
    window.isSecureContext;
  const permissionBlocked = permissionState === "denied";

  const clearTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (heartbeatIdRef.current !== null) {
      window.clearInterval(heartbeatIdRef.current);
      heartbeatIdRef.current = null;
    }
  }, []);

  const writeLocation = useCallback(
    async (position: GeolocationPosition, force = false) => {
      if (!role) return;

      const now = Date.now();

      if (!force && now - lastWriteAtRef.current < LOCATION_WRITE_INTERVAL_MS) {
        return;
      }

      lastPositionRef.current = position;

      await setDoc(
        doc(db, "locations", role),
        {
          role,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          sharing: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      lastWriteAtRef.current = now;
      sharingRef.current = true;
    },
    [role]
  );

  const stopSharing = useCallback(
    async (showToast = true) => {
      clearTracking();
      setStarting(false);
      setWatching(false);
      lastWriteAtRef.current = 0;
      lastPositionRef.current = null;

      if (role && sharingRef.current) {
        sharingRef.current = false;

        try {
          await setDoc(
            doc(db, "locations", role),
            {
              role,
              sharing: false,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          if (showToast) {
            toast.success("Location sharing stopped.");
          }
        } catch (stopError) {
          toast.error(
            stopError instanceof Error
              ? stopError.message
              : "Could not stop sharing location."
          );
        }
      }
    },
    [clearTracking, role]
  );

  const startHeartbeat = useCallback(() => {
    if (heartbeatIdRef.current !== null) {
      window.clearInterval(heartbeatIdRef.current);
    }

    heartbeatIdRef.current = window.setInterval(() => {
      const latestPosition = lastPositionRef.current;

      if (latestPosition) {
        void writeLocation(latestPosition, true).catch((writeError) => {
          setGeoError(
            writeError instanceof Error
              ? writeError.message
              : "Could not update live location."
          );
        });
      }
    }, LOCATION_HEARTBEAT_MS);
  }, [writeLocation]);

  const startSharing = useCallback(() => {
    if (!role) {
      toast.error("Pick your role first.");
      return;
    }

    if (!canUseLocation) {
      const message = window.isSecureContext
        ? "This browser does not support location sharing."
        : "Location sharing needs HTTPS. Localhost is allowed for development.";
      setGeoError(message);
      toast.error(message);
      return;
    }

    setStarting(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void writeLocation(position, true)
          .then(() => {
            watchIdRef.current = navigator.geolocation.watchPosition(
              (nextPosition) => {
                lastPositionRef.current = nextPosition;
                setGeoError(null);
                void writeLocation(nextPosition).catch((writeError) => {
                  setGeoError(
                    writeError instanceof Error
                      ? writeError.message
                      : "Could not update live location."
                  );
                });
              },
              (watchError) => {
                const message = getLocationErrorMessage(watchError);
                setGeoError(message);

                if (watchError.code === watchError.PERMISSION_DENIED) {
                  void stopSharing(false);
                }
              },
              {
                enableHighAccuracy: true,
                maximumAge: 5_000,
                timeout: 20_000,
              }
            );
            startHeartbeat();
            setWatching(true);
            toast.success("Live location sharing started.");
          })
          .catch((writeError) => {
            setGeoError(
              writeError instanceof Error
                ? writeError.message
                : "Could not save your location."
            );
          })
          .finally(() => setStarting(false));
      },
      (locationError) => {
        const message = getLocationErrorMessage(locationError);
        setGeoError(message);
        setStarting(false);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      }
    );
  }, [canUseLocation, role, startHeartbeat, stopSharing, writeLocation]);

  const handleStopClick = useCallback(() => {
    void stopSharing();
  }, [stopSharing]);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setPermissionState("unknown");
      return;
    }

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    void navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (!mounted) return;

        permissionStatus = status;
        setPermissionState(status.state);
        status.onchange = () => setPermissionState(status.state);
      })
      .catch(() => setPermissionState("unknown"));

    return () => {
      mounted = false;

      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  useEffect(
    () => () => {
      clearTracking();

      if (role && sharingRef.current) {
        void setDoc(
          doc(db, "locations", role),
          {
            role,
            sharing: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    },
    [clearTracking, role]
  );

  return (
    <Page
      eyebrow="Live map"
      title="Location"
      description="Share your location with each other while this page is open. The browser asks permission first, and you can stop sharing anytime."
      action={
        watching ? (
          <Button variant="secondary" onClick={handleStopClick}>
            Stop
          </Button>
        ) : (
          <Button
            onClick={startSharing}
            disabled={starting || !canUseLocation || permissionBlocked}
          >
            {starting ? "Starting..." : "Start"}
          </Button>
        )
      }
    >
      <Card className="overflow-hidden p-0">
        <div className="relative h-[24rem] overflow-hidden rounded-[2rem] bg-rose-100">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={2}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMapToLocations locations={displayedLocations} />
            {displayedLocations.map((location) => {
              const isLive = location.sharing && isLocationFresh(location);

              return (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={markerIcons[location.role]}
              >
                <Popup>
                  <strong>{getNickname(location.role)}</strong>
                  <br />
                  {isLive ? "Live now" : "Last known location"}
                  <br />
                  Last updated {formatLastUpdated(location.updatedAt)}
                </Popup>
              </Marker>
              );
            })}
            {displayedLocations.map((location) => {
              const isLive = location.sharing && isLocationFresh(location);

              return typeof location.accuracy === "number" &&
                location.accuracy > 0 ? (
                <Circle
                  key={`${location.id}-accuracy`}
                  center={[location.latitude, location.longitude]}
                  radius={location.accuracy}
                  pathOptions={{
                    color: location.role === "me" ? "#f43f5e" : "#d946ef",
                    fillOpacity: isLive ? 0.08 : 0.04,
                    opacity: isLive ? 0.22 : 0.12,
                  }}
                />
              ) : null;
            })}
          </MapContainer>

          {!loading && displayedLocations.length === 0 ? (
            <div className="pointer-events-none absolute inset-4 grid place-items-center rounded-[1.5rem] bg-white/80 p-5 text-center backdrop-blur">
              <EmptyState
                icon={MapPin}
                title="No saved location yet"
                description="Tap Start sharing and approve the browser prompt to save the first location."
              />
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <LocationStatusCard
          label={role ? getNickname(role) : "You"}
          location={currentLocation}
        />
        <LocationStatusCard
          label={partnerRole ? getNickname(partnerRole) : "Partner"}
          location={partnerLocation}
        />
      </div>

      <Card>
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-rose-950">
                Permission stays in your control
              </h2>
              <p className="mt-1 text-sm leading-6 text-rose-700/75">
                This uses the free browser Geolocation API. It only works after
                you allow access, and web browsers do not reliably track in the
                background.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm font-semibold text-rose-700/80 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/65 p-3">
              <Navigation className="size-4 text-rose-500" />
              {permissionState === "unknown"
                ? "Permission unknown"
                : `Permission ${permissionState}`}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/65 p-3">
              <Crosshair className="size-4 text-rose-500" />
              {window.isSecureContext ? "HTTPS ready" : "HTTPS needed"}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/65 p-3">
              <Clock className="size-4 text-rose-500" />
              Updates every 30s
            </div>
          </div>

          {geoError || error ? (
            <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-bold text-rose-700">
              {geoError || error}
            </p>
          ) : null}
        </div>
      </Card>
    </Page>
  );
}
