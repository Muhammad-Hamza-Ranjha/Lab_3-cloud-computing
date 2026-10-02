"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type InstanceStatus = "Running" | "Stopped";
type MachineType = "e2-small" | "e2-medium" | "e2-standard-2" | "n2-standard-4" | "c2-standard-8";

type Instance = {
  id: string;
  name: string;
  region: string;
  machineType: MachineType;
  status: InstanceStatus;
};

type InstanceDraft = Omit<Instance, "id">;
type Filter = "All instances" | InstanceStatus;

const STORAGE_KEY = "nimbus-compute-instances-v1";
const MONTHLY_HOURS = 730;
const machineRates: Record<MachineType, number> = {
  "e2-small": 0.0134,
  "e2-medium": 0.0268,
  "e2-standard-2": 0.067,
  "n2-standard-4": 0.168,
  "c2-standard-8": 0.34,
};

const seedInstances: Instance[] = [
  { id: "vm-8f21a7", name: "production-api", region: "us-central1-a", machineType: "n2-standard-4", status: "Running" },
  { id: "vm-41c9de", name: "web-staging", region: "europe-west1-b", machineType: "e2-standard-2", status: "Running" },
  { id: "vm-b0634f", name: "analytics-worker", region: "asia-south1-a", machineType: "c2-standard-8", status: "Stopped" },
  { id: "vm-2d17c8", name: "redis-cache", region: "us-east1-c", machineType: "e2-medium", status: "Running" },
  { id: "vm-a95e30", name: "demo-environment", region: "asia-south1-b", machineType: "e2-small", status: "Stopped" },
];

const regions = ["us-central1-a", "us-east1-c", "europe-west1-b", "asia-south1-a", "asia-south1-b"];
const machineTypes = Object.keys(machineRates) as MachineType[];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "grid": return <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.7"/></svg>;
    case "server": return <svg {...common}><rect x="3.5" y="3.5" width="17" height="7" rx="2"/><rect x="3.5" y="13.5" width="17" height="7" rx="2"/><path d="M7.5 7h.01M7.5 17h.01M11 7h6M11 17h6"/></svg>;
    case "database": return <svg {...common}><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
    case "network": return <svg {...common}><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.5 6h7M7.5 8l3.2 7.7M16.5 8l-3.2 7.7"/></svg>;
    case "wallet": return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="2.5"/><path d="M3 9h18M16 14h2M6 5l1.5-2h10L19 5"/></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1.8-1.2 2.1-1.3-.5a7.8 7.8 0 0 1-1.6.9l-.2 1.4h-2.5l-.3-1.4a7.8 7.8 0 0 1-1.7-.9l-1.3.5-1.2-2.1 1.1-.9a7 7 0 0 1 0-1.8l-1.1-.9 1.2-2.1 1.3.5a7.8 7.8 0 0 1 1.7-.9l.3-1.4h2.5l.2 1.4a7.8 7.8 0 0 1 1.6.9l1.3-.5 1.2 2.1-1.1.9a7 7 0 0 1-.1 1.8Z" transform="translate(-1 -1)"/></svg>;
    case "help": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1.2-2 1.4-2 3M12 17h.01"/></svg>;
    case "bell": return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>;
    case "search": return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.3 4.3"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "chevron": return <svg {...common}><path d="m7 10 5 5 5-5"/></svg>;
    case "edit": return <svg {...common}><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z"/></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "spark": return <svg {...common}><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1 1-2.5Z"/></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "globe": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [instances, setInstances] = useState<Instance[]>(seedInstances);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All instances");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState<Instance | null>(null);
  const [draft, setDraft] = useState<InstanceDraft>({ name: "", region: regions[0], machineType: "e2-medium", status: "Running" });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Instance[];
        if (Array.isArray(parsed)) setInstances(parsed);
      }
    } catch {
      // Keep the starter instances if browser storage is unavailable or invalid.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
    } catch {
      // Keep this workspace usable when browser storage is disabled or full.
    }
  }, [instances, ready]);

  useEffect(() => {
    if (!modalOpen && !deleting) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
        setDeleting(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleting, modalOpen]);

  const runningCount = instances.filter((instance) => instance.status === "Running").length;
  const monthlySpend = instances.reduce((total, instance) => total + (instance.status === "Running" ? machineRates[instance.machineType] * MONTHLY_HOURS : 0), 0);
  const activeRegions = new Set(instances.map((instance) => instance.region.slice(0, -2))).size;

  const visibleInstances = useMemo(() => {
    const search = query.trim().toLowerCase();
    return instances.filter((instance) => {
      const matchesStatus = filter === "All instances" || instance.status === filter;
      const matchesQuery = !search || `${instance.name} ${instance.id} ${instance.region} ${instance.machineType}`.toLowerCase().includes(search);
      return matchesStatus && matchesQuery;
    });
  }, [filter, instances, query]);

  function openCreate() {
    setEditing(null);
    setDraft({ name: "", region: regions[0], machineType: "e2-medium", status: "Running" });
    setModalOpen(true);
  }

  function openEdit(instance: Instance) {
    setEditing(instance);
    setDraft({ name: instance.name, region: instance.region, machineType: instance.machineType, status: instance.status });
    setModalOpen(true);
  }

  function saveInstance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    if (editing) {
      setInstances((current) => current.map((instance) => instance.id === editing.id ? { ...instance, ...draft, name } : instance));
    } else {
      const id = `vm-${Math.random().toString(16).slice(2, 8)}`;
      setInstances((current) => [{ ...draft, name, id }, ...current]);
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleting) return;
    setInstances((current) => current.filter((instance) => instance.id !== deleting.id));
    setDeleting(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Nimbus home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">nimbus<span>.</span></span>
        </a>

        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><span>Workspace</span><strong>Acme Studio</strong></div>
          <Icon name="chevron" size={15} />
        </div>

        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item" href="#overview"><Icon name="grid" /><span>Overview</span></a>
          <a className="nav-item active" href="#instances" aria-current="page"><Icon name="server" /><span>Instances</span><span className="nav-count">{instances.length}</span></a>
          <a className="nav-item" href="#usage"><Icon name="wallet" /><span>Usage & billing</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-card-icon"><Icon name="spark" size={16} /></div>
            <strong>Need a hand?</strong>
            <p>Our cloud experts are around the clock.</p>
            <a href="mailto:support@nimbus.example">Visit help center <Icon name="arrow" size={14} /></a>
          </div>
          <a className="nav-item" href="#settings"><Icon name="settings" /><span>Settings</span></a>
          <div className="profile-row">
            <div className="profile-avatar">JD</div>
            <div className="profile-copy"><strong>Jordan Davis</strong><span>jordan@acme.co</span></div>
            <button className="icon-button profile-more" aria-label="Profile options"><span>···</span></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>Instances</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Icon name="search" size={17} /><input aria-label="Search instances" placeholder="Search anything..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" size={18} /><i /></button>
            <div className="topbar-avatar">JD</div>
          </div>
        </header>

        <div className="page-content" id="overview">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" /> CLOUD CONSOLE <span className="eyebrow-divider">/</span> COMPUTE</p>
              <h1>Your compute, <span>in good hands.</span></h1>
              <p className="welcome-subtitle">A clear view of every machine powering your work.</p>
            </div>
            <button className="primary-button" onClick={openCreate}><Icon name="plus" size={18} /> New instance</button>
          </section>

          <section className="hero-banner" aria-label="Compute overview">
            <div className="hero-copy">
              <div className="hero-pill"><span /> ALL SYSTEMS OPERATIONAL</div>
              <h2>Big ideas need<br />a little <em>cloud.</em></h2>
              <p>Your infrastructure is in a healthy place. Keep building — we’ll keep an eye on things.</p>
              <a className="hero-link" href="#instances">Explore your instances <Icon name="arrow" size={16} /></a>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="hero-sun" />
              <div className="cloud-shape"><span /><span /><span /><div className="cloud-base" /></div>
              <div className="float-chip chip-one"><i /><span>Compute</span><b>99.9%</b></div>
              <div className="float-chip chip-two"><i /><span>Latency</span><b>24 ms</b></div>
              <div className="sparkle sparkle-one">✳</div><div className="sparkle sparkle-two">✦</div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Instance summary">
            <article className="stat-card" id="usage">
              <div className="stat-top"><span className="stat-icon lavender"><Icon name="server" size={17} /></span><span className="stat-label">TOTAL INSTANCES</span><span className="stat-note">All time</span></div>
              <div className="stat-value">{instances.length}<span className="stat-unit">machines</span></div>
              <div className="stat-foot"><span className="status-dot running-dot" />{runningCount} running <span className="stat-separator">·</span> {instances.length - runningCount} stopped</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon mint"><Icon name="spark" size={17} /></span><span className="stat-label">MONTHLY FORECAST</span><span className="stat-note">This month</span></div>
              <div className="stat-value">{formatMoney(monthlySpend)}<span className="stat-unit">/ month</span></div>
              <div className="stat-foot"><span className="trend-up">↗</span>Based on running instances</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon peach"><Icon name="globe" size={17} /></span><span className="stat-label">ACTIVE REGIONS</span><span className="stat-note">Global</span></div>
              <div className="stat-value">{activeRegions}<span className="stat-unit">regions</span></div>
              <div className="stat-foot"><span className="region-marker">◉</span>Across 3 continents</div>
            </article>
          </section>

          <section className="instances-section" id="instances">
            <div className="section-heading">
              <div><div className="section-title-row"><h2>Your instances</h2><span className="total-badge">{instances.length}</span></div><p>Manage the machines in your workspace.</p></div>
              <button className="secondary-button" onClick={openCreate}><Icon name="plus" size={16} /> Add instance</button>
            </div>

            <div className="inventory-card">
              <div className="inventory-toolbar">
                <div className="filter-tabs" role="tablist" aria-label="Filter instances">
                  {(["All instances", "Running", "Stopped"] as Filter[]).map((option) => (
                    <button key={option} className={`filter-tab ${filter === option ? "selected" : ""}`} onClick={() => setFilter(option)} role="tab" aria-selected={filter === option}>
                      {option}{option === "Running" && <span className="tab-count">{runningCount}</span>}
                    </button>
                  ))}
                </div>
                <label className="table-search"><Icon name="search" size={16} /><input placeholder="Filter instances..." aria-label="Filter instances" value={query} onChange={(event) => setQuery(event.target.value)} /><span>/</span></label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>INSTANCE</th><th>REGION</th><th>MACHINE TYPE</th><th>STATUS</th><th>MONTHLY EST.</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {visibleInstances.map((instance, index) => (
                      <tr key={instance.id}>
                        <td><div className="instance-cell"><span className={`machine-icon machine-${index % 4}`}><Icon name="server" size={17} /></span><div className="instance-name"><strong>{instance.name}</strong><span>{instance.id}</span></div></div></td>
                        <td><span className="region-cell"><span className="tiny-globe"><Icon name="globe" size={14} /></span>{instance.region}</span></td>
                        <td><span className="type-pill">{instance.machineType}</span></td>
                        <td><span className={`status-badge ${instance.status.toLowerCase()}`}><span />{instance.status}</span></td>
                        <td><span className="monthly-price">{formatMoney(machineRates[instance.machineType] * MONTHLY_HOURS)}<small>/mo</small></span></td>
                        <td><div className="row-actions"><button className="row-action" aria-label={`Edit ${instance.name}`} title="Edit instance" onClick={() => openEdit(instance)}><Icon name="edit" size={16} /></button><button className="row-action delete-action" aria-label={`Delete ${instance.name}`} title="Delete instance" onClick={() => setDeleting(instance)}><Icon name="trash" size={16} /></button></div></td>
                      </tr>
                    ))}
                    {visibleInstances.length === 0 && <tr><td colSpan={6}><div className="empty-state"><span className="empty-icon"><Icon name="search" size={21} /></span><strong>No instances found</strong><p>Try another search or create a new instance.</p><button className="text-button" onClick={openCreate}><Icon name="plus" size={15} /> Create an instance</button></div></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="inventory-footer"><span>Showing <strong>{visibleInstances.length}</strong> of <strong>{instances.length}</strong> instances</span><span className="sync-note"><span className="sync-dot" /> {ready ? "Changes saved" : "Loading your workspace"}</span></div>
            </div>
          </section>

          <footer className="page-footer"><span>© 2025 Nimbus Cloud</span><div><a href="#help">Documentation</a><a href="#help">System status <span className="footer-status" /></a><a href="#help">Privacy</a></div></footer>
        </div>
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="instance-modal-title">
          <div className="modal-header"><div className="modal-heading-icon"><Icon name={editing ? "edit" : "server"} size={19} /></div><div><h2 id="instance-modal-title">{editing ? "Edit instance" : "Create an instance"}</h2><p>{editing ? "Update this machine’s configuration." : "Choose a name and configuration for your new machine."}</p></div><button className="icon-button modal-close" onClick={() => setModalOpen(false)} aria-label="Close dialog"><Icon name="close" size={18} /></button></div>
          <form onSubmit={saveInstance}>
            <label className="form-field"><span>Instance name</span><input autoFocus required maxLength={40} placeholder="e.g. production-api" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <div className="form-row">
              <label className="form-field"><span>Region</span><span className="select-wrap"><select value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })}>{regions.map((region) => <option key={region}>{region}</option>)}</select><Icon name="chevron" size={15} /></span></label>
              <label className="form-field"><span>Machine type</span><span className="select-wrap"><select value={draft.machineType} onChange={(event) => setDraft({ ...draft, machineType: event.target.value as MachineType })}>{machineTypes.map((type) => <option key={type}>{type}</option>)}</select><Icon name="chevron" size={15} /></span></label>
            </div>
            <label className="form-field"><span>Initial status</span><span className="select-wrap"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as InstanceStatus })}><option>Running</option><option>Stopped</option></select><Icon name="chevron" size={15} /></span></label>
            <div className="estimate-note"><Icon name="spark" size={17} /><span>Estimated at <strong>{formatMoney(machineRates[draft.machineType] * MONTHLY_HOURS)} / month</strong> while running</span></div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Icon name={editing ? "check" : "plus"} size={17} />{editing ? "Save changes" : "Create instance"}</button></div>
          </form>
        </section>
      </div>}

      {deleting && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleting(null); }}>
        <section className="modal-card delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="delete-icon"><Icon name="trash" size={21} /></div><h2 id="delete-modal-title">Delete {deleting.name}?</h2><p>This will permanently remove <strong>{deleting.id}</strong> from your workspace. This action can’t be undone.</p>
          <div className="modal-actions"><button className="secondary-button" onClick={() => setDeleting(null)}>Keep instance</button><button className="danger-button" onClick={confirmDelete}><Icon name="trash" size={16} /> Delete instance</button></div>
        </section>
      </div>}
    </div>
  );
}
