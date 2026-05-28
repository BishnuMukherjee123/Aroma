"use client";

import { useState, useRef, useTransition } from "react";
import { 
  type MeResponse, 
  updateUserProfile, 
  getAvatarUploadUrl, 
  uploadFileToSignedUrl 
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function ProfileSettings({
  user,
  token,
  onUserUpdate,
}: {
  user: MeResponse;
  token: string;
  onUserUpdate: (updatedUser: MeResponse) => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [mobile, setMobile] = useState(user.mobile || "");
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [location, setLocation] = useState(user.location || "");
  const [profilePicUrl, setProfilePicUrl] = useState(user.profilePicUrl || "");
  
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage({ text: "Only JPEG, PNG, and WEBP images are allowed.", type: "error" });
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "Image must be under 5MB.", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      // 1. Get signed upload URL from backend
      const uploadCreds = await getAvatarUploadUrl(token, {
        fileName: file.name,
        mimeType: file.type,
      });

      // 2. Upload file directly to Supabase storage
      await uploadFileToSignedUrl({
        signedUrl: uploadCreds.uploadUrl,
        file,
        mimeType: file.type,
      });

      // 3. Update local state
      setProfilePicUrl(uploadCreds.publicUrl);
      setMessage({ text: "Profile picture uploaded! Make sure to save changes.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to upload profile picture.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startSaveTransition(async () => {
      try {
        const updated = await updateUserProfile(token, {
          name: name.trim(),
          mobile: mobile.trim(),
          companyName: companyName.trim(),
          location: location.trim(),
          profilePicUrl: profilePicUrl.trim(),
        });

        // Update global parent state
        onUserUpdate({
          ...user,
          ...updated,
        });

        setMessage({ text: "Profile settings updated successfully!", type: "success" });
      } catch (err: any) {
        setMessage({ text: err.message || "Failed to save profile settings.", type: "error" });
      }
    });
  };

  const initials = user.email.charAt(0).toUpperCase();

  return (
    <section className="dash-fade-up max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="dash-title text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-on-surface">
          Account Settings
        </h1>
        <p className="text-sm font-medium leading-6 text-on-surface-variant">
          Update your profile details, contact information, and business credentials.
        </p>
      </div>

      <div className="dash-panel p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative group shrink-0">
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt="Profile Avatar"
                  className="size-24 rounded-full border border-white/60 object-cover shadow-[0_10px_25px_rgba(18,28,42,0.08)]"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-surface-container-high to-surface-container-low text-3xl font-bold text-primary shadow-[0_10px_25px_rgba(18,28,42,0.08)]">
                  {initials}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <span className="spinner-sm border-white" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-base font-bold text-on-surface">Profile Picture</h3>
              <p className="text-xs text-on-surface-variant max-w-xs">
                Only JPG, PNG or WEBP. Max size of 5MB.
              </p>
              <div className="flex justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="dash-cta-outline inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
                >
                  <span className="material-symbols-outlined text-sm">upload</span>
                  Upload Photo
                </button>
                {profilePicUrl && (
                  <button
                    type="button"
                    onClick={() => setProfilePicUrl("")}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <hr className="border-outline-variant/15" />

          {/* Form Fields */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                Personal Profile
              </h3>
              
              <div>
                <label htmlFor="profile-name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jerry Holland"
                  className="dash-create-input w-full rounded-[0.95rem] px-4 py-3 text-sm font-medium"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  disabled
                  className="dash-create-input w-full rounded-[0.95rem] bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface-variant/70 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="profile-mobile" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Mobile Number
                </label>
                <input
                  id="profile-mobile"
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="dash-create-input w-full rounded-[0.95rem] px-4 py-3 text-sm font-medium"
                />
              </div>
            </div>

            {/* Corporate/Business Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                Business Details
              </h3>

              <div>
                <label htmlFor="profile-company" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Company Name
                </label>
                <input
                  id="profile-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Aroma Restaurants Group"
                  className="dash-create-input w-full rounded-[0.95rem] px-4 py-3 text-sm font-medium"
                />
              </div>

              <div>
                <label htmlFor="profile-location" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Corporate Location
                </label>
                <input
                  id="profile-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai, Maharashtra"
                  className="dash-create-input w-full rounded-[0.95rem] px-4 py-3 text-sm font-medium"
                />
              </div>
            </div>

          </div>

          {/* Feedback Messages */}
          {message && (
            <div
              className={cn(
                "rounded-[0.95rem] px-4 py-3 text-sm font-semibold",
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-error-container text-error border border-red-100"
              )}
            >
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="dash-cta flex items-center justify-center gap-2 rounded-[1rem] px-6 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <span className="spinner-sm" /> : null}
              <span className="material-symbols-outlined text-base">save</span>
              Save Profile Settings
            </button>
          </div>

        </form>
      </div>
    </section>
  );
}
