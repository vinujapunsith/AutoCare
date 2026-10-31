import React, { useEffect, useState } from "react";
import { api } from "../api";
import { PageHead } from "../components/Common";
import "./profile-settings.css";

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export default function Profile({ user, setUser }) {
  const [profile, setProfile] = useState(user || {});
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    currentPassword: ""
  });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [profileNotice, setProfileNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then(data => {
        if (!active) return;
        setProfile(data);
        setProfileForm({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          currentPassword: ""
        });
      })
      .catch(error => {
        if (active) setProfileNotice({ type: "error", text: error.message || "Could not load profile details." });
      });
    return () => { active = false; };
  }, []);

  const emailChanged = String(profileForm.email || "").trim().toLowerCase() !== String(profile.email || "").trim().toLowerCase();

  const updateProfileField = event => {
    const { name, value } = event.target;
    setProfileForm(current => ({ ...current, [name]: value }));
    setProfileNotice(null);
  };

  const saveProfile = async event => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);

    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase()
      };
      if ((user?.role || profile.role) === "User") {
        payload.phone = profileForm.phone.trim();
      }
      if (emailChanged) payload.currentPassword = profileForm.currentPassword;

      const updated = await api("/auth/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setProfile(updated);
      setProfileForm({
        name: updated.name || "",
        phone: updated.phone || "",
        email: updated.email || "",
        currentPassword: ""
      });
      setUser(current => ({ ...current, ...updated }));
      setProfileNotice({ type: "success", text: "Your profile details have been updated." });
    } catch (error) {
      setProfileNotice({ type: "error", text: error.message || "Could not save profile details." });
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePasswordField = event => {
    const { name, value } = event.target;
    setPasswordForm(current => ({ ...current, [name]: value }));
    setPasswordNotice(null);
  };

  const changePassword = async event => {
    event.preventDefault();
    setPasswordNotice(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice({ type: "error", text: "The new password and confirmation do not match." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordNotice({ type: "error", text: "Your new password must contain at least 6 characters." });
      return;
    }

    setSavingPassword(true);
    try {
      const result = await api("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(passwordForm)
      });
      setPasswordForm(emptyPasswordForm);
      setPasswordNotice({ type: "success", text: result.message || "Your password has been changed." });
    } catch (error) {
      setPasswordNotice({ type: "error", text: error.message || "Could not change password." });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageHead title="Profile & Settings" subtitle="Manage your account" />
      <div className="profile-settings-layout">
        <section className="panel profile-settings-card">
          <div className="profile-settings-heading">
            <div>
              <span className="profile-settings-eyebrow">PERSONAL INFORMATION</span>
              <h3>Profile details</h3>
              <p>{(user?.role || profile.role) === "User" ? "Update your name, phone number and email address." : "Update your name and email address."}</p>
            </div>
            <span className="profile-settings-icon" aria-hidden="true">◎</span>
          </div>

          <form className="profile-settings-form" onSubmit={saveProfile}>
            <div className="profile-settings-grid">
              <label>
                Full Name
                <input
                  name="name"
                  value={profileForm.name}
                  onChange={updateProfileField}
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
              {(user?.role || profile.role) === "User" && (
                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={updateProfileField}
                    autoComplete="tel"
                    maxLength={25}
                  />
                </label>
              )}
              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  value={profileForm.email}
                  onChange={updateProfileField}
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Account Role
                <input value={profile.role || user?.role || "User"} readOnly disabled />
              </label>
            </div>

            {emailChanged && (
              <label className="profile-settings-current-password">
                Current Password <span>(required to change email)</span>
                <input
                  type="password"
                  name="currentPassword"
                  value={profileForm.currentPassword}
                  onChange={updateProfileField}
                  autoComplete="current-password"
                  required
                />
              </label>
            )}

            <p className="profile-settings-note">For your security, your current password is required when you change your email address.</p>
            {profileNotice && (
              <div className={`profile-settings-message ${profileNotice.type}`} role="status">
                {profileNotice.text}
              </div>
            )}
            <div className="profile-settings-actions">
              <button className="profile-settings-button" type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel profile-settings-card">
          <div className="profile-settings-heading">
            <div>
              <span className="profile-settings-eyebrow">ACCOUNT SECURITY</span>
              <h3>Change password</h3>
              <p>Choose a new password to keep your account secure.</p>
            </div>
            <span className="profile-settings-icon security" aria-hidden="true">⌑</span>
          </div>

          <form className="profile-settings-form" onSubmit={changePassword}>
            <div className="profile-settings-password-grid">
              <label>
                Current Password
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={updatePasswordField}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={updatePasswordField}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
              <label className="profile-settings-confirm-password">
                Confirm New Password
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={updatePasswordField}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
            </div>
            <p className="profile-settings-note">Use at least 6 characters. Your current password must be correct before the change can be saved.</p>
            {passwordNotice && (
              <div className={`profile-settings-message ${passwordNotice.type}`} role="status">
                {passwordNotice.text}
              </div>
            )}
            <div className="profile-settings-actions">
              <button className="profile-settings-button" type="submit" disabled={savingPassword}>
                {savingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
