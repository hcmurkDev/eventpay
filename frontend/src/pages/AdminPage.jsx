import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../utils/api';

function formatDate(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

// Expandable stall row with per-attendee transaction grouping
function StallRow({ s, creditToCash, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [txs, setTxs]           = useState([]);
  const [loading, setLoading]   = useState(false);
  const loaded = useRef(false);

  const toggle = async () => {
    if (!expanded && !loaded.current) {
      setLoading(true);
      try {
        const { data } = await api.get('/admin/stalls/' + s.id + '/transactions-admin');
        setTxs(data);
        loaded.current = true;
      } catch { toast.error('Failed to load transactions'); }
      finally { setLoading(false); }
    }
    setExpanded(e => !e);
  };

  // Group transactions by attendee
  const grouped = txs.reduce((acc, tx) => {
    if (!acc[tx.attendee_id]) acc[tx.attendee_id] = { name: tx.attendee_name, txs: [] };
    acc[tx.attendee_id].txs.push(tx);
    return acc;
  }, {});

  return (
    <div style={{ marginBottom: '8px' }}>
      <div className="stall-row" style={{ cursor: 'pointer' }} onClick={toggle}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.email}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {s.tx_count} transaction{s.tx_count !== 1 ? 's' : ''}
            {s.tx_count > 0 && (
              <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>
                <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                {expanded ? ' less' : ' details'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="stall-payout">LSL {s.earned * creditToCash}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.earned} credits</div>
          </div>
          <button className="btn btn-ghost btn-sm"
            style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '6px 10px' }}
            onClick={e => { e.stopPropagation(); onDelete(s.id, s.name); }}>
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{
          background: 'rgba(124,92,252,.04)', border: '1px solid var(--border)',
          borderTop: 'none', borderRadius: '0 0 12px 12px',
          padding: '12px 16px',
        }}>
          {loading && <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
            <i className="ti ti-loader" style={{ marginRight: '6px' }} />Loading…
          </div>}
          {!loading && txs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>No transactions yet</div>}
          {!loading && Object.entries(grouped).map(([attId, group]) => (
            <AttendeeGroup key={attId} name={group.name} txs={group.txs} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttendeeGroup({ name, txs }) {
  const [open, setOpen] = useState(false);
  const total = txs.reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ marginBottom: '8px', background: 'var(--card)', borderRadius: '10px', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>{name[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{txs.length} transaction{txs.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '14px' }}>+{total}</div>
          <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ color: 'var(--muted)', fontSize: '14px' }} />
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '4px 14px 10px' }}>
          {txs.map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <span style={{ color: 'var(--muted)' }}>{formatDate(tx.created_at)}</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>+{tx.amount} credits</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage({ onHome }) {
  const { login, logout, role } = useAuth();
  const [pin, setPin]         = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('overview');

  // Data
  const [overview, setOverview]   = useState(null);
  const [stalls, setStalls]       = useState([]);
  const [attendees, setAttendees] = useState([]);

  // Forms
  const [newStall, setNewStall]     = useState({ name: '', email: '' });
  const [newAtt, setNewAtt]         = useState({ name: '', email: '', credits: '' });
  const [search, setSearch]         = useState('');
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult]         = useState(null);
  const [importingStall, setImportingStall]     = useState(false);
  const [importStallResult, setImportStallResult] = useState(null);
  const fileRef      = useRef();
  const stallFileRef = useRef();

  // Custom confirm dialog state
  const [dialog, setDialog] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', danger: false, onConfirm: null });

  const confirm = useCallback((title, message, onConfirm, { confirmLabel = 'Confirm', danger = false } = {}) => {
    setDialog({ open: true, title, message, confirmLabel, danger, onConfirm });
  }, []);

  const closeDialog = () => setDialog(d => ({ ...d, open: false }));

  useEffect(() => { if (role === 'admin') fetchAll(); }, [role]);

  const fetchAll = async () => {
    try {
      const [ov, st, at] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/stalls'),
        api.get('/admin/attendees'),
      ]);
      setOverview(ov.data);
      setStalls(st.data);
      setAttendees(at.data);
    } catch { toast.error('Failed to load data'); }
  };

  const fetchAttendees = async (q = '') => {
    try {
      const url = q ? `/admin/attendees?search=${encodeURIComponent(q)}` : '/admin/attendees';
      const { data } = await api.get(url);
      setAttendees(data);
    } catch {}
  };

  const handleLogin = async () => {
    if (!pin) return toast.error('Enter the admin PIN');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', { pin });
      login(data.token, 'admin');
      toast.success('Admin access granted');
    } catch { toast.error('Wrong PIN'); }
    finally { setLoading(false); }
  };

  const addStall = async () => {
    if (!newStall.name.trim()) return toast.error('Enter a stall name');
    if (!newStall.email.trim()) return toast.error('Enter the owner email');
    try {
      const { data } = await api.post('/admin/stalls', { name: newStall.name, email: newStall.email });
      setStalls(s => [data, ...s]);
      setNewStall({ name: '', email: '' });
      toast.success('Stall "' + data.name + '" created');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteStall = (id, name) => {
    confirm(
      'Delete Stall',
      `Are you sure you want to remove "${name}"? All their transaction records will also be deleted.`,
      async () => {
        closeDialog();
        try {
          await api.delete('/admin/stalls/' + id);
          setStalls(s => s.filter(x => x.id !== id));
          toast.success('Stall deleted');
        } catch { toast.error('Delete failed'); }
      },
      { confirmLabel: 'Delete', danger: true }
    );
  };

  const addAttendee = async () => {
    if (!newAtt.name.trim() || !newAtt.email.trim()) return toast.error('Name and email required');
    const credits = newAtt.credits !== '' ? parseInt(newAtt.credits) : null;
    if (newAtt.credits !== '' && (isNaN(credits) || credits < 0)) return toast.error('Credits must be a positive number');
    try {
      const payload = { name: newAtt.name, email: newAtt.email };
      if (credits !== null) payload.credits = credits;
      const { data } = await api.post('/admin/attendees', payload);
      setAttendees(a => [data, ...a]);
      setNewAtt({ name: '', email: '', credits: '' });
      toast.success('Attendee added with ' + data.credits + ' credits');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteAttendee = (id, name) => {
    confirm(
      'Remove Attendee',
      `Remove "${name}" from the event? Their credits and transaction history will be deleted.`,
      async () => {
        closeDialog();
        try {
          await api.delete('/admin/attendees/' + id);
          setAttendees(a => a.filter(x => x.id !== id));
          toast.success('Attendee removed');
        } catch { toast.error('Delete failed'); }
      },
      { confirmLabel: 'Remove', danger: true }
    );
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/admin/attendees/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(data);
      toast.success('Imported ' + data.imported + ' attendees');
      fetchAttendees();
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleStallImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingStall(true); setImportStallResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/admin/stalls/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportStallResult(data);
      toast.success('Imported ' + data.imported + ' stalls');
      const { data: st } = await api.get('/admin/stalls');
      setStalls(st);
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed'); }
    finally { setImportingStall(false); if (stallFileRef.current) stallFileRef.current.value = ''; }
  };

  const downloadStallExcel = () => {
    const token = localStorage.getItem('ep_token');
    fetch((import.meta.env.VITE_API_URL || '/api') + '/admin/stalls/export', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => { if (!res.ok) throw new Error(); return res.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eventpay-payouts-${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Excel downloaded!');
      })
      .catch(() => toast.error('Export failed'));
  };

  const handleReset = () => {
    confirm(
      'Reset All Event Data',
      'This will permanently delete ALL attendees, stalls, and transactions. This cannot be undone.',
      async () => {
        closeDialog();
        try {
          await api.delete('/admin/reset', { data: { confirm: 'RESET' } });
          toast.success('Event data cleared');
          fetchAll();
        } catch { toast.error('Reset failed'); }
      },
      { confirmLabel: 'Reset Everything', danger: true }
    );
  };

  const creditToCash = overview?.credit_to_cash || 1;

  // ── LOGIN ─────────────────────────────────────────────────────────
  // if (role !== 'admin') {
  //   return (
  //     <div className="fade-in">
  //       <div className="hero"><h1>Admin</h1><p>Organizer dashboard</p></div>
  //       <div className="card">
  //         <div className="card-title">Admin PIN</div>
  //         <div className="form-row">
  //           <label><i className="ti ti-lock" style={{ marginRight:'4px' }} />PIN</label>
  //           <input type="password" placeholder="Enter PIN" value={pin}
  //             onChange={e => setPin(e.target.value)}
  //             onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
  //         </div>
  //         <button className="btn btn-primary mt" disabled={loading} onClick={handleLogin}>
  //           {loading ? <><i className="ti ti-loader" style={{marginRight:'6px'}} />Checking…</> : <><i className="ti ti-login" style={{marginRight:'6px'}} />Login</>}
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  if (role !== 'admin') {
    return (
      <div className="fade-in" style={{ paddingBottom: '80px' }}>
        <div className="hero"><h1>Admin</h1><p>Organizer dashboard</p></div>
        <div className="card">
          <div className="card-title">Admin PIN</div>
          <div className="form-row">
            <label><i className="ti ti-lock" style={{ marginRight:'4px' }} />PIN</label>
            <input type="password" placeholder="Enter PIN" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
          </div>
          <button className="btn btn-primary mt" disabled={loading} onClick={handleLogin}>
            {loading ? <><i className="ti ti-loader" style={{marginRight:'6px'}} />Checking…</> : <><i className="ti ti-login" style={{marginRight:'6px'}} />Login</>}
          </button>
        </div>
        <nav className="bottom-nav">
          <button onClick={onHome} style={{ flex: 1 }}>
            <i className="ti ti-home nav-icon" aria-hidden="true" />
            <span>Home</span>
          </button>
        </nav>
      </div>
    );
  }

  const TABS = ['overview', 'stalls', 'attendees'];

  return (
    <div className="fade-in">
      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        danger={dialog.danger}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />

      <div className="hero"><h1>Admin Dashboard</h1><p>Live event overview</p></div>

      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex:1, padding:'10px', fontSize:'12px', textTransform:'capitalize', whiteSpace:'nowrap' }}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && overview && (
        <>
          <div className="admin-grid">
            <div className="stat-card"><div className="stat-big" style={{color:'var(--accent)'}}>{overview.attendees}</div><div className="stat-lbl">Attendees</div></div>
            <div className="stat-card"><div className="stat-big" style={{color:'var(--amber)'}}>{overview.stalls}</div><div className="stat-lbl">Stalls</div></div>
            <div className="stat-card"><div className="stat-big" style={{color:'var(--green)'}}>{overview.total_credits_spent}</div><div className="stat-lbl">Credits Spent</div></div>
            <div className="stat-card"><div className="stat-big" style={{color:'var(--red)'}}>LSL {overview.total_credits_spent * creditToCash}</div><div className="stat-lbl">Total Payout</div></div>
          </div>
          
          <div className="card">
            <div className="card-title">Event Info</div>
            {[
              { icon: 'ti-arrows-exchange', label: 'Exchange Rate',          val: `1 credit = LSL ${creditToCash}`,               color: 'var(--accent)' },
              { icon: 'ti-receipt',         label: 'Total Transactions',      val: overview.total_transactions,                    color: 'var(--accent2)' },
              { icon: 'ti-wallet',          label: 'Credits in Wallets',      val: `${overview.total_credits_remaining} credits`,  color: 'var(--green)' },
              { icon: 'ti-coin',            label: 'Total Credits Issued',    val: `${overview.total_credits_remaining + overview.total_credits_spent} credits`, color: 'var(--amber)' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: `${item.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: '18px', color: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '.4px', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost mt" onClick={fetchAll}>
            <i className="ti ti-refresh" style={{marginRight:'6px'}} />Refresh
          </button>
          <button className="btn btn-danger mt" style={{marginTop:'8px'}} onClick={handleReset}>
            <i className="ti ti-trash" style={{marginRight:'6px'}} />Reset Event Data
          </button>
        </>
      )}

      {/* ── STALLS ── */}
      {tab === 'stalls' && (
        <>
          <div className="card">
            <div className="card-title">Add New Stall</div>
            <div className="form-row">
              <label><i className="ti ti-building-store" style={{marginRight:'4px'}} />Stall Name</label>
              <input placeholder="e.g. Mama's Kitchen" value={newStall.name}
                onChange={e => setNewStall(s => ({...s, name:e.target.value}))} />
            </div>
            <div className="form-row">
              <label><i className="ti ti-mail" style={{marginRight:'4px'}} />Owner Email</label>
              <input type="email" placeholder="owner@email.com" value={newStall.email}
                onChange={e => setNewStall(s => ({...s, email:e.target.value}))}
                onKeyDown={e => e.key === 'Enter' && addStall()} />
            </div>
            <button className="btn btn-primary mt" onClick={addStall}>
              <i className="ti ti-plus" style={{marginRight:'6px'}} />Add Stall
            </button>
          </div>

          <div className="card">
            <div className="card-title">Bulk Import Stalls from Excel</div>
            <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'12px',lineHeight:1.6}}>
              Columns: <code style={{color:'var(--accent)'}}>name</code> · <code style={{color:'var(--accent)'}}>email</code>
              <br/><span style={{fontSize:'11px'}}>Or just put name in col A, email in col B — no headers needed</span>
            </p>
            <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',padding:'14px',border:'2px dashed var(--border)',borderRadius:'10px',cursor:'pointer',color:'var(--muted)',fontSize:'14px'}}>
              <input ref={stallFileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleStallImport} disabled={importingStall} />
              {importingStall
                ? <><i className="ti ti-loader" style={{marginRight:'8px'}} /> Importing…</>
                : <><i className="ti ti-upload" style={{marginRight:'8px',fontSize:'18px'}} /> Click to upload Excel / CSV</>}
            </label>
            {importStallResult && (
              <div style={{marginTop:'12px',padding:'12px',background:'rgba(34,211,160,.08)',border:'1px solid rgba(34,211,160,.2)',borderRadius:'10px',fontSize:'13px'}}>
                <div style={{color:'var(--green)',fontWeight:600}}><i className="ti ti-circle-check" style={{marginRight:'6px'}} />Import complete</div>
                <div style={{color:'var(--muted)',marginTop:'4px'}}>Imported: {importStallResult.imported} | Skipped: {importStallResult.skipped}</div>
                {importStallResult.errors?.length > 0 && <div style={{color:'var(--red)',marginTop:'6px',fontSize:'12px'}}>{importStallResult.errors.join(', ')}</div>}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">All Stalls — Payout Summary</div>
            {stalls.length === 0
              ? <div className="empty-state">No stalls yet</div>
              : stalls.map(s => (
                <StallRow key={s.id} s={s} creditToCash={creditToCash} onDelete={deleteStall} />
              ))
            }
          </div>

          <button className="btn btn-ghost mt" onClick={downloadStallExcel}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            <i className="ti ti-file-spreadsheet" style={{fontSize:'18px'}} />Export Payout Summary to Excel
          </button>
        </>
      )}

      {/* ── ATTENDEES ── */}
      {tab === 'attendees' && (
        <>
          <div className="card">
            <div className="card-title">Add Single Attendee</div>
            <div className="form-row">
              <label><i className="ti ti-user" style={{marginRight:'4px'}} />Full Name</label>
              <input placeholder="Full name" value={newAtt.name}
                onChange={e => setNewAtt(a => ({...a, name:e.target.value}))} />
            </div>
            <div className="form-row">
              <label><i className="ti ti-mail" style={{marginRight:'4px'}} />Email</label>
              <input type="email" placeholder="email@example.com" value={newAtt.email}
                onChange={e => setNewAtt(a => ({...a, email:e.target.value}))} />
            </div>
            <div className="form-row">
              <label><i className="ti ti-coin" style={{marginRight:'4px'}} />Credits <span style={{color:'var(--muted)',fontWeight:400}}>(leave blank for default {overview?.starting_credits || 100})</span></label>
              <input type="number" placeholder={String(overview?.starting_credits || 100)} min="0" max="100000"
                value={newAtt.credits} onChange={e => setNewAtt(a => ({...a, credits:e.target.value}))}
                onKeyDown={e => e.key === 'Enter' && addAttendee()} />
            </div>
            <button className="btn btn-primary mt" onClick={addAttendee}>
              <i className="ti ti-user-plus" style={{marginRight:'6px'}} />Add Attendee
            </button>
          </div>

          <div className="card">
            <div className="card-title">Bulk Import from Excel</div>
            <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'12px',lineHeight:1.6}}>
              Columns: <code style={{color:'var(--accent)'}}>name</code> · <code style={{color:'var(--accent)'}}>email</code> · <code style={{color:'var(--accent)'}}>credits</code> (optional)
              <br/><span style={{fontSize:'11px'}}>Or just col A=name, col B=email, col C=credits — no headers needed</span>
            </p>
            <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',padding:'14px',border:'2px dashed var(--border)',borderRadius:'10px',cursor:'pointer',color:'var(--muted)',fontSize:'14px'}}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleImport} disabled={importing} />
              {importing
                ? <><i className="ti ti-loader" style={{marginRight:'8px'}} /> Importing…</>
                : <><i className="ti ti-upload" style={{marginRight:'8px',fontSize:'18px'}} /> Click to upload Excel / CSV</>}
            </label>
            {importResult && (
              <div style={{marginTop:'12px',padding:'12px',background:'rgba(34,211,160,.08)',border:'1px solid rgba(34,211,160,.2)',borderRadius:'10px',fontSize:'13px'}}>
                <div style={{color:'var(--green)',fontWeight:600}}><i className="ti ti-circle-check" style={{marginRight:'6px'}} />Import complete</div>
                <div style={{color:'var(--muted)',marginTop:'4px'}}>Imported: {importResult.imported} | Skipped: {importResult.skipped}</div>
                {importResult.errors?.length > 0 && <div style={{color:'var(--red)',marginTop:'6px',fontSize:'12px'}}>{importResult.errors.join(', ')}</div>}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">All Attendees ({attendees.length})</div>
            <input placeholder="Search by name or email…" value={search}
              onChange={e => { setSearch(e.target.value); fetchAttendees(e.target.value); }}
              style={{marginBottom:'12px'}} />
            {attendees.length === 0
              ? <div className="empty-state">No attendees yet</div>
              : attendees.map(a => (
                <div className="tx-item" key={a.id}>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="tx-name" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</div>
                    <div className="tx-time" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'14px',fontWeight:700,color:'var(--accent)'}}>{a.credits}</div>
                      <div style={{fontSize:'11px',color:'var(--muted)'}}>credits left</div>
                    </div>
                    <button className="btn btn-ghost btn-sm"
                      style={{color:'var(--red)',borderColor:'var(--red)',padding:'6px 10px'}}
                      onClick={() => deleteAttendee(a.id, a.name)}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  );
}
