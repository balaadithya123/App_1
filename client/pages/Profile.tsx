import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Edit3,
  Globe,
  Headphones,
  Home,
  ImagePlus,
  LogIn,
  LogOut,
  Mic,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NavBar from "@/components/NavBar";
import ThemeToggle from "@/components/ThemeToggle";
import GoogleLocationInput from "@/components/GoogleLocationInput";
import { supabase } from "@/lib/supabase";
import { setStandardLocation } from "@/lib/location";

type ProfileData = {
  name: string;
  phone: string;
  category: string;
  location: string;
  experience: string;
  services: string;
  about: string;
  avatar_url?: string;
};

const emptyProfile: ProfileData = {
  name: "",
  phone: "",
  category: "",
  location: "",
  experience: "",
  services: "",
  about: "",
  avatar_url: "",
};

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [draft, setDraft] = useState<ProfileData>(emptyProfile);
  const [email, setEmail] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingContact, setPendingContact] = useState<
    "email" | "phone" | null
  >(null);
  const [pendingValue, setPendingValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (location.state && (location.state as any).edit) {
      setEditing(true);
    }
  }, [location.state]);

  const role = useMemo(
    () =>
      user?.user_metadata?.role === "worker"
        ? "Worker"
        : user?.user_metadata?.role === "agency"
          ? "Agency"
          : user?.user_metadata?.role === "employer"
            ? "Employer"
            : "Member",
    [user],
  );
  const isWorker = role === "Worker";

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        const m = data.user.user_metadata ?? {};
        const rawPhone = m.phone || data.user.phone || "";
        const normalizedPhone = rawPhone
          .replace(/^\+91/, "")
          .replace(/\D/g, "")
          .slice(-10);
        const next = {
          name: m.name || "",
          phone: normalizedPhone,
          category: m.category || "",
          location: m.location || "",
          experience: m.experience || "",
          services: m.services || "",
          about: m.about || "",
          avatar_url: m.avatar_url || "",
        };
        setProfile(next);
        setDraft(next);
        setEmail(data.user.email || "");
        setDraftEmail(data.user.email || "");
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const uploadPhoto = async (file: File) => {
    if (!supabase || !user) return;
    setError("");
    setMessage("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/profile.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: avatarUrl },
      });
      if (updateError) throw updateError;
      const next = { ...profile, avatar_url: avatarUrl };
      setProfile(next);
      setDraft(next);
      setUser((u: any) =>
        u
          ? {
              ...u,
              user_metadata: { ...u.user_metadata, avatar_url: avatarUrl },
            }
          : u,
      );
      setMessage("Profile photo updated.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to upload profile photo.",
      );
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!supabase || !user) return;
    setError("");
    setMessage("");
    const phone = draft.phone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter exactly 10 digits after +91.");
      return;
    }
    setSaving(true);
    try {
      const contactChanged =
        draftEmail.trim().toLowerCase() !== email.trim().toLowerCase();
      const phoneChanged = phone !== profile.phone;
      const metadata = { ...draft, phone };
      if (contactChanged) {
        const newEmail = draftEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          setError("Enter a valid email address.");
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({
          email: newEmail,
          data: metadata,
        });
        if (updateError) throw updateError;
        setPendingContact("email");
        setPendingValue(newEmail);
        setMessage(
          "A verification code has been sent to the new email address. Check your inbox.",
        );
      } else if (phoneChanged) {
        const { error: updateError } = await supabase.auth.updateUser({
          phone: `+91${phone}`,
          data: { ...draft, phone: profile.phone },
        });
        if (updateError) throw updateError;
        setPendingContact("phone");
        setPendingValue(phone);
        setMessage(
          "A verification code has been sent to the new phone number.",
        );
      } else {
        const { error: updateError } = await supabase.auth.updateUser({
          data: metadata,
        });
        if (updateError) throw updateError;
        if (metadata.location) {
          setStandardLocation(metadata.location, true);
        }
        setProfile(metadata);
        setDraft(metadata);
        setEditing(false);
        setMessage("Profile updated successfully.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const verifyContact = async () => {
    if (!supabase || !pendingContact || !otp.trim()) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const verifyType =
        pendingContact === "email" ? "email_change" : "phone_change";
      const verifyValue =
        pendingContact === "email" ? pendingValue : `+91${pendingValue}`;
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: verifyType as any,
        token: otp.trim(),
        [pendingContact]: verifyValue,
      } as any);
      if (verifyError) throw verifyError;
      const finalProfile = {
        ...draft,
        phone: pendingContact === "phone" ? pendingValue : draft.phone,
      };
      const { data, error: metadataError } = await supabase.auth.updateUser({
        data: finalProfile,
      });
      if (metadataError) throw metadataError;
      setUser(data.user ?? user);
      setProfile(finalProfile);
      setDraft(finalProfile);
      if (pendingContact === "email") {
        setEmail(pendingValue);
        setDraftEmail(pendingValue);
      }
      setPendingContact(null);
      setPendingValue("");
      setOtp("");
      setEditing(false);
      setMessage("Contact verified and profile updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid verification code.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!supabase) return;
    setDeleting(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session)
        throw new Error("Your session has expired. Please log in again.");
      const { data, error: fnError } = await supabase.functions.invoke(
        "delete-account",
        { body: {} },
      );
      if (fnError) throw fnError;
      if (!data?.success)
        throw new Error(data?.error || "Unable to delete your account.");
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to delete your account right now.",
      );
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const logout = async () => {
    await supabase?.auth.signOut();
    setUser(null);
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-lg pb-24">
            <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center shadow-soft">
              <p className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                Loading account details...
              </p>
            </section>
          </div>
        </main>
        <NavBar />
      </div>
    );
  }

  // GUEST STATE (NOT LOGGED IN)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-lg space-y-4 pb-24">
            {/* Back Navigation Bar */}
            <div className="flex items-center justify-between pb-1">
              <Link
                to="/home"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#141416] px-3.5 py-1.5 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer active:scale-95"
                aria-label="Back to Homepage"
              >
                <ArrowLeft size={14} />
                <span>Back to Home</span>
              </Link>

              <Link
                to="/home"
                className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white transition"
              >
                Home
              </Link>
            </div>

            {/* Top Profile Card */}
            <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-6 shadow-soft sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] text-primary shadow-subtle shrink-0">
                <UserRound size={28} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4F4F5] truncate">
                  Guest Account
                </h1>
                <p className="text-xs text-[#67696D] dark:text-[#A1A1AA] mt-0.5">
                  Sign in to access your worker profile and saved history.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link
                to="/login"
                state={{ from: "main" }}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#09090B] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#09090B] dark:hover:bg-neutral-200 py-2.5 px-4 text-xs font-semibold shadow-xs transition cursor-pointer active:scale-95 border border-transparent"
              >
                <LogIn size={14} /> Sign In
              </Link>
              <Link
                to="/join"
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#141416] py-2.5 px-4 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer active:scale-95"
              >
                <UserPlus size={14} /> Register
              </Link>
            </div>
          </section>

          {/* Quick Shortcuts */}
          <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-[#67696D] dark:text-[#71717A] mb-3">
              Quick Access
            </p>
            <div className="divide-y divide-[#E7ECF1] dark:divide-[#1F1F1F]">
              <Link
                to="/home"
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Home size={16} className="text-primary shrink-0" />
                  <span>Homepage & Search Pros</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
              <Link
                to="/inbox"
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-primary shrink-0" />
                  <span>Inbox & Recurring Maintenance</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
              <Link
                to="/saved"
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bookmark size={16} className="text-primary shrink-0" />
                  <span>Saved Workers & Bookmarks</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
              <Link
                to="/assistant"
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-primary shrink-0" />
                  <span>AI Search Assistant</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
              <Link
                to="/voice-onboarding"
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Mic size={16} className="text-primary shrink-0" />
                  <span>Voice Onboarding</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
              <Link
                to="/login"
                state={{ from: "main" }}
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-primary shrink-0" />
                  <span>Agency Management Portal</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
              <Link
                to="/safety"
                className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-primary shrink-0" />
                  <span>Safety, Verification & Rules</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-[#989EA7] dark:text-[#71717A]"
                />
              </Link>
            </div>
          </section>
        </div>
      </main>
      <NavBar />
    </div>
  );
}

  // AUTHENTICATED USER STATE
  const details: [string, string][] = [
    ["Name", profile.name || "Not set"],
    ["Email", email || "Not set"],
    ["Phone", profile.phone ? `+91 ${profile.phone}` : "Not set"],
  ];
  if (isWorker) {
    details.push(
      ["Work Category", profile.category || "Not set"],
      ["Location", profile.location || "Not set"],
      ["Experience", profile.experience || "Not set"],
      ["Services Offered", profile.services || "Not set"],
      ["About You", profile.about || "Not set"],
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-lg space-y-4 pb-24">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between pb-1">
            <Link
              to="/home"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#141416] px-3.5 py-1.5 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer active:scale-95"
              aria-label="Back to Homepage"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>

            <Link
              to="/home"
              className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white transition"
            >
              Home
            </Link>
          </div>

          <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-6 shadow-soft sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] text-primary shadow-subtle">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound size={28} strokeWidth={1.8} />
                  )}
                </div>
                <label
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white dark:border-black bg-black text-white dark:bg-white dark:text-black shadow-subtle hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
                  aria-label="Upload profile photo"
                >
                  <ImagePlus size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                  {profile.name || "My Account"}
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-primary inline-flex items-center gap-1">
                  <UserCheck size={13} /> {role} Account
                </p>
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setDraft(profile);
                  setDraftEmail(email);
                  setError("");
                  setMessage("");
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E7ECF1] dark:border-[#242424] bg-white dark:bg-[#141414] px-3.5 py-1.5 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:bg-[#F6F9FC] dark:hover:bg-[#1c1c1c] shadow-subtle cursor-pointer transition"
              >
                <Edit3 size={14} /> Edit
              </button>
            )}
          </div>

          {uploading && (
            <p className="mt-3 text-center text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA]">
              Uploading profile photo...
            </p>
          )}

          {!editing ? (
            <div className="mt-6 space-y-2.5">
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[12px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#121212] px-4 py-2.5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#67696D] dark:text-[#71717A]">
                    {label}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {[
                  ["name", "Name"],
                  ["phone", "Phone Number"],
                  ["category", "Work Category"],
                  ["experience", "Years of Experience"],
                  ["services", "Services Offered"],
                ]
                  .filter(([id]) => isWorker || ["name", "phone"].includes(id))
                  .map(([id, label]) => (
                    <div key={id}>
                      <label className="mb-1 block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                        {label}
                      </label>
                      {id === "phone" ? (
                        <div className="flex h-10 overflow-hidden rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] focus-within:border-primary focus-within:bg-white dark:focus-within:bg-[#0A0A0A] transition">
                          <span className="flex items-center border-r border-[#E7ECF1] dark:border-[#242424] bg-white dark:bg-[#1c1c1c] px-3 text-xs font-bold text-[#67696D] dark:text-[#A1A1AA]">
                            +91
                          </span>
                          <input
                            inputMode="numeric"
                            maxLength={10}
                            value={(draft as any)[id]}
                            onChange={(e) =>
                              setDraft((v) => ({
                                ...v,
                                [id]: e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10),
                              }))
                            }
                            disabled={pendingContact === "phone"}
                            placeholder="10-digit mobile number"
                            className="min-w-0 flex-1 bg-transparent px-3 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] outline-none placeholder:text-[#989EA7]"
                          />
                        </div>
                      ) : (
                        <input
                          value={(draft as any)[id]}
                          onChange={(e) =>
                            setDraft((v) => ({ ...v, [id]: e.target.value }))
                          }
                          className="h-10 w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] px-3 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:outline-none transition placeholder:text-[#989EA7]"
                        />
                      )}
                    </div>
                  ))}
                <div className="sm:col-span-2">
                  <GoogleLocationInput
                    name="location"
                    label="Primary Location / Service Area"
                    value={draft.location}
                    onChange={(loc) =>
                      setDraft((v) => ({ ...v, location: loc }))
                    }
                    placeholder="Search locality or auto-detect GPS..."
                    helperText="Stored as your standard location for nearby requests and discovery."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    disabled={pendingContact === "email"}
                    className="h-10 w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] px-3 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:outline-none transition placeholder:text-[#989EA7]"
                  />
                </div>
                {isWorker && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                      About You
                    </label>
                    <textarea
                      rows={3}
                      value={draft.about}
                      onChange={(e) =>
                        setDraft((v) => ({ ...v, about: e.target.value }))
                      }
                      className="w-full resize-none rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] px-3 py-2.5 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:outline-none transition placeholder:text-[#989EA7]"
                    />
                  </div>
                )}
              </div>

              {message && (
                <p className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-4 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {message}
                </p>
              )}
              {error && (
                <p className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}

              {pendingContact ? (
                <div className="rounded-[16px] border border-primary-100/60 dark:border-primary/30 bg-primary-100/10 dark:bg-primary/5 p-4 shadow-subtle">
                  <p className="text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                    Verify your{" "}
                    {pendingContact === "email"
                      ? "new email"
                      : "new phone number"}
                  </p>
                  <p className="mt-1 text-[11px] text-[#67696D] dark:text-[#A1A1AA]">
                    Enter the OTP sent to {pendingValue}.
                  </p>
                  <input
                    inputMode="numeric"
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Verification code"
                    className="mt-2.5 h-10 w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-white dark:bg-[#141414] px-3 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={verifyContact}
                    disabled={saving}
                    className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold shadow-subtle hover:bg-neutral-800 dark:hover:bg-neutral-200 transition disabled:opacity-60 cursor-pointer"
                  >
                    <Check size={15} />
                    Verify & Save
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex h-10 flex-1 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold shadow-subtle hover:bg-neutral-800 dark:hover:bg-neutral-200 transition disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7ECF1] dark:border-[#242424] bg-white dark:bg-[#141414] px-5 text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] hover:bg-[#F6F9FC] dark:hover:bg-[#1c1c1c] shadow-subtle transition cursor-pointer"
                  >
                    <X size={15} /> Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {message && !editing && (
            <p className="mt-4 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-4 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {message}
            </p>
          )}
        </section>

        {/* Quick Shortcuts */}
        <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-[#67696D] dark:text-[#71717A] mb-3">
            Quick Navigation
          </p>
          <div className="divide-y divide-[#E7ECF1] dark:divide-[#1F1F1F]">
            <Link
              to="/home"
              className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Home size={16} className="text-primary shrink-0" />
                <span>Homepage & Browse Local Pros</span>
              </div>
              <ChevronRight
                size={14}
                className="text-[#989EA7] dark:text-[#71717A]"
              />
            </Link>
            <Link
              to="/inbox"
              className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-primary shrink-0" />
                <span>Inbox & Home Recurring Maintenance</span>
              </div>
              <ChevronRight
                size={14}
                className="text-[#989EA7] dark:text-[#71717A]"
              />
            </Link>
            <Link
              to="/saved"
              className="flex items-center justify-between py-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:text-primary transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Bookmark size={16} className="text-primary shrink-0" />
                <span>Saved Workers & Bookmarks</span>
              </div>
              <ChevronRight
                size={14}
                className="text-[#989EA7] dark:text-[#71717A]"
              />
            </Link>
          </div>
        </section>

        {/* Account Actions */}
        <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-5 shadow-soft space-y-3">
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5] hover:bg-white dark:hover:bg-[#1c1c1c] shadow-subtle transition cursor-pointer"
          >
            <LogOut size={15} /> Logout
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setDeleteOpen(true);
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 shadow-subtle transition cursor-pointer"
          >
            <Trash2 size={15} /> Delete account
          </button>

          {deleteOpen && (
            <div className="mt-4 rounded-[14px] border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400"
                  size={18}
                />
                <div>
                  <p className="font-bold text-xs text-rose-800 dark:text-rose-300">
                    Delete your account?
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-rose-700 dark:text-rose-400">
                    This permanently removes your LocalWorker login account.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-3.5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="flex-1 rounded-full border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#141414] py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 shadow-subtle transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-full bg-rose-600 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-subtle transition disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
    <NavBar />
  </div>
);
}
