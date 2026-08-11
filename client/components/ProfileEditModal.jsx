"use client";

import { useRef, useState } from "react";
import { mutate } from "swr";
import { Camera, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Avatar } from "@/components/ui";

// Self-service CV editor: profile picture, typed CV header, experience and
// education. Each section saves on its own, so nothing is lost if one fails.
export default function ProfileEditModal({ employeeId, header, cv, experience, education, onChanged, onClose }) {
  const [basics, setBasics] = useState({
    headline: cv.headline || "",
    summary: cv.summary || "",
    phone: cv.phone || "",
    location_text: cv.location_text || "",
    linkedin_url: cv.linkedin_url || "",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => {
    setBasics({ ...basics, [k]: e.target.value });
    setDirty(true);
    setSaved(false);
  };

  function requestClose() {
    if (dirty && !window.confirm("Your summary changes are not saved yet. Close anyway?")) return;
    onClose();
  }

  async function saveBasics() {
    setSaving(true);
    setErr("");
    try {
      await api.put(`/employees/${employeeId}/cv`, basics);
      setDirty(false);
      setSaved(true);
      onChanged();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={requestClose}>
      <div className="my-6 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Edit Profile</h3>
            <button onClick={requestClose} className="text-slate-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <p className="mb-5 text-xs text-slate-500">
            Type in your own CV details. Any change sets your profile back to <strong>Not Verified</strong>, so ask for verification again once you are done.
          </p>

          <PhotoSection employeeId={employeeId} name={header.full_name} photoUrl={header.photo_url} onChanged={onChanged} />

          <Section title="Summary & Contact">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Labeled label="Headline" className="sm:col-span-2">
                <input className="input" placeholder="Validation Engineer – EV Systems" value={basics.headline} onChange={set("headline")} />
              </Labeled>
              <Labeled label="Professional summary" className="sm:col-span-2">
                <textarea className="input" rows={5} placeholder="A few lines about your experience, domains and strengths…" value={basics.summary} onChange={set("summary")} />
              </Labeled>
              <Labeled label="Phone">
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="+91 98xxxxxxxx"
                  value={basics.phone}
                  onChange={(e) => {
                    // 1. Remove any characters that are NOT numbers, spaces, +, (, ), or -
                    const filteredValue = e.target.value.replace(/[^0-9+\s()\-]/g, "");

                    // 2. Count ONLY the actual digits to enforce the 10-digit limit
                    const digitsOnly = filteredValue.replace(/\D/g, "");

                    // If the user tries to type more than 10 digits, block the update
                    if (digitsOnly.length <= 10) {
                      set("phone")({ target: { value: filteredValue } });
                    }
                  }}
                />
              </Labeled>
              <Labeled label="Location">
                <input className="input" placeholder="Gurugram" value={basics.location_text} onChange={set("location_text")} />
              </Labeled>
              <Labeled label="LinkedIn URL" className="sm:col-span-2">
                <input className="input" placeholder="https://www.linkedin.com/in/…" value={basics.linkedin_url} onChange={set("linkedin_url")} />
              </Labeled>
            </div>
            {err ? <p className="mt-2 text-xs text-bad">{err}</p> : null}
            <div className="mt-3 flex items-center justify-end gap-3">
              {saved ? <span className="text-xs text-good">Saved</span> : null}
              <button className="btn-primary" onClick={saveBasics} disabled={saving || !dirty}>
                {saving ? "Saving…" : "Save Details"}
              </button>
            </div>
          </Section>

          <ListEditor
            title="Experience"
            addLabel="Add Experience"
            basePath={`/employees/${employeeId}/experience`}
            items={experience}
            fields={EXPERIENCE_FIELDS}
            requiredKey="title"
            onChanged={onChanged}
          />

          <ListEditor
            title="Education"
            addLabel="Add Education"
            basePath={`/employees/${employeeId}/education`}
            items={education}
            fields={EDUCATION_FIELDS}
            requiredKey="degree"
            onChanged={onChanged}
          />

          <div className="mt-5 flex justify-end">
            <button className="btn-ghost" onClick={requestClose}>
              Close
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

const EXPERIENCE_FIELDS = [
  { key: "title", label: "Job title *", placeholder: "Validation Engineer" },
  { key: "organization", label: "Organization", placeholder: "Powertrain Engineering" },
  { key: "start_date", label: "Start date", type: "date" },
  { key: "end_date", label: "End date (blank = current)", type: "date" },
  {
    key: "description",
    label: "What you did",
    type: "textarea",
    full: true,
    placeholder: "EV validation planning, charging diagnostics, issue closure…",
  },
];

const EDUCATION_FIELDS = [
  { key: "degree", label: "Degree *", placeholder: "B.Tech" },
  { key: "institution", label: "Institution", placeholder: "Delhi Technological University" },
  { key: "field_of_study", label: "Field of study", placeholder: "Mechanical Engineering" },
  { key: "grade", label: "Grade", placeholder: "8.4 CGPA" },
  { key: "start_year", label: "Start year", type: "number", placeholder: "2014" },
  { key: "end_year", label: "End year", type: "number", placeholder: "2018" },
];

// Add / edit / delete rows of one CV section. Each row saves independently.
function ListEditor({ title, addLabel, basePath, items, fields, requiredKey, onChanged }) {
  const counter = useRef(0);
  const [rows, setRows] = useState(() => items.map((it) => ({ ...it, _key: `saved-${it.id}` })));
  const [busyKey, setBusyKey] = useState(null);
  const [err, setErr] = useState("");

  const requiredLabel = (fields.find((f) => f.key === requiredKey)?.label || "This field").replace(" *", "");

  function addRow() {
    counter.current += 1;
    setRows((prev) => [...prev, { _key: `new-${counter.current}` }]);
  }

  function edit(key, fieldKey, value) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [fieldKey]: value } : r)));
  }

  async function save(row) {
    if (!String(row[requiredKey] || "").trim()) {
      setErr(`${requiredLabel} is required`);
      return;
    }
    setBusyKey(row._key);
    setErr("");
    try {
      const payload = {};
      fields.forEach((f) => {
        const raw = row[f.key];
        if (f.type === "number") payload[f.key] = raw === "" || raw == null ? null : Number(raw);
        else payload[f.key] = raw === "" ? null : (raw ?? null);
      });
      const result = row.id ? await api.put(`${basePath}/${row.id}`, payload) : await api.post(basePath, payload);
      setRows((prev) => prev.map((r) => (r._key === row._key ? { ...result, _key: `saved-${result.id}` } : r)));
      onChanged();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(row) {
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r._key !== row._key));
      return;
    }
    if (!window.confirm("Remove this entry?")) return;
    setBusyKey(row._key);
    setErr("");
    try {
      await api.del(`${basePath}/${row.id}`);
      setRows((prev) => prev.filter((r) => r._key !== row._key));
      onChanged();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Section title={title}>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row._key} className="rounded-lg border border-line bg-ink-900 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <Labeled key={f.key} label={f.label} className={f.full ? "sm:col-span-2" : ""}>
                  {f.type === "textarea" ? (
                    <textarea className="input" rows={2} placeholder={f.placeholder} value={row[f.key] || ""} onChange={(e) => edit(row._key, f.key, e.target.value)} />
                  ) : (
                    <input className="input" type={f.type || "text"} placeholder={f.placeholder} value={row[f.key] ?? ""} onChange={(e) => edit(row._key, f.key, e.target.value)} />
                  )}
                </Labeled>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="btn-ghost text-bad" onClick={() => remove(row)} disabled={busyKey === row._key}>
                <Trash2 size={14} /> Remove
              </button>
              <button className="btn-primary" onClick={() => save(row)} disabled={busyKey === row._key}>
                {busyKey === row._key ? "Saving…" : row.id ? "Save" : "Add"}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-slate-500">Nothing added yet.</p> : null}
        {err ? <p className="text-xs text-bad">{err}</p> : null}
        <button className="btn-ghost" onClick={addRow}>
          <Plus size={14} /> {addLabel}
        </button>
      </div>
    </Section>
  );
}

// Profile picture: preview, pick, upload to Supabase Storage.
function PhotoSection({ employeeId, name, photoUrl, onChanged }) {
  const [preview, setPreview] = useState(photoUrl || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pick(e) {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setErr("");
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.upload(`/employees/${employeeId}/photo`, form);
      setPreview(result.photo_url);
      setFile(null);
      // The topbar avatar reads /employees/me, so refresh that too — otherwise
      // the new picture shows on the profile but the header keeps the old one.
      mutate("/employees/me");
      onChanged();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Profile Picture">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name} src={preview} size={64} />
        <div>
          <label className="btn-ghost cursor-pointer">
            <Camera size={14} /> Choose image
            <input type="file" accept="image/*" className="hidden" onChange={pick} />
          </label>
          <p className="mt-1.5 text-xs text-slate-500">PNG, JPG, WEBP or GIF · up to 5 MB</p>
        </div>
        {file ? (
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        ) : null}
      </div>
      {err ? <p className="mt-2 text-xs text-bad">{err}</p> : null}
    </Section>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5 border-t border-line pt-4 first:border-0 first:pt-0">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {children}
    </div>
  );
}

function Labeled({ label, className = "", children }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
