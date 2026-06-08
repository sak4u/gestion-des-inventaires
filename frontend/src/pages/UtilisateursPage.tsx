import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { Badge, EmptyState, Spinner, SearchInput } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { usersApi, authApi } from '../api/index';
import { Users, User as UserIcon, Edit2, Plus, AlertTriangle, UserX, UserCheck } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role?: {
    id?: string;
    name?: string;
  };
  dateCreation?: string;
}

interface UserForm {
  name: string;
  email: string;
  password?: string;
  roleName: string;
}

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', roleName: 'RESPONSABLE_STOCK' };

const ROLE_VARIANT: Record<string, 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray'> = {
  ADMIN: 'purple',
  RESPONSABLE_STOCK: 'blue',
  ACHAT: 'orange',
};

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Confirm deactivation state
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const [toggling, setToggling] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers((res.data ?? []) as User[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    authApi.roles().then(res => setRoles(res.data)).catch(() => {});
  }, [load]);

  const changeRole = async (userId: string, roleName: string) => {
    setActionId(userId);
    try {
      await usersApi.update(userId, { roleName });
      await load();
    } finally {
      setActionId(null);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditTarget(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      roleName: user.role?.name ?? 'RESPONSABLE_STOCK',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Le nom complet est obligatoire.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Une adresse e-mail valide est obligatoire.');
      return;
    }
    if (!editTarget) {
      if (!form.password || form.password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await usersApi.update(editTarget.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          roleName: form.roleName,
        });
      } else {
        await usersApi.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || '',
          roleName: form.roleName,
        });
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' — ') : (message ?? 'Erreur lors de l\'enregistrement.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleClick = async (user: User) => {
    if (user.isActive) {
      setToggleTarget(user);
    } else {
      setActionId(user.id);
      try {
        await usersApi.toggleActive(user.id);
        await load();
      } catch (err: any) {
        alert(err?.response?.data?.message ?? 'Erreur lors de la réactivation.');
      } finally {
        setActionId(null);
      }
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await usersApi.toggleActive(toggleTarget.id);
      setToggleTarget(null);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Erreur lors de la désactivation.');
    } finally {
      setToggling(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (user.role?.name ?? '').toLowerCase().includes(needle),
    );
  }, [users, search]);

  return (
    <div>
      <PageHeader
        icon={<Users size={28} />}
        title="Utilisateurs"
        subtitle={`${filteredUsers.length} / ${users.length} utilisateur(s)`}
        actions={
          <button
            className="btn-icon"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={openCreate}
            id="btn-nouvel-utilisateur"
          >
            <Plus size={16} /> Ajouter un utilisateur
          </button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <SearchInput placeholder="Rechercher nom, email, rôle..." onSearch={setSearch} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={36} />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={<UserIcon size={48} />} title="Aucun utilisateur" subtitle="La liste des utilisateurs est vide." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Date création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const role = user.role?.name ?? 'INCONNU';
                return (
                  <tr
                    key={user.id}
                    className="table-row"
                    style={!user.isActive ? { opacity: 0.55 } : {}}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge variant={ROLE_VARIANT[role] ?? 'gray'}>{role}</Badge>
                    </td>
                    <td>
                      <Badge variant={user.isActive ? 'green' : 'red'}>
                        {user.isActive ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    <td>
                      {user.dateCreation
                        ? new Date(user.dateCreation).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          className="field-select"
                          style={{ width: 170, padding: '5px 10px' }}
                          value={role}
                          disabled={actionId === user.id || !user.isActive}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                        >
                          {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          disabled={actionId === user.id}
                          onClick={() => openEdit(user)}
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className={user.isActive ? 'btn-danger' : 'btn-secondary'}
                          style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          disabled={actionId === user.id}
                          onClick={() => handleToggleClick(user)}
                          title={user.isActive ? 'Désactiver' : 'Réactiver'}
                        >
                          {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajouter / Modifier */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? `Modifier — ${editTarget.name}` : 'Nouvel utilisateur'}
        size="sm"
      >
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}
        <div className="field-group">
          <label className="field-label">Nom complet *</label>
          <input
            className="field-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Mohamed Sakly"
          />
        </div>
        <div className="field-group">
          <label className="field-label">Adresse e-mail *</label>
          <input
            className="field-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Ex: vous@exemple.com"
          />
        </div>
        {!editTarget && (
          <div className="field-group">
            <label className="field-label">Mot de passe *</label>
            <input
              className="field-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 8 caractères"
            />
          </div>
        )}
        <div className="field-group">
          <label className="field-label">Rôle *</label>
          <select
            className="field-select"
            value={form.roleName}
            onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}
          >
            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
            Annuler
          </button>
          <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={16} /> : editTarget ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </Modal>

      {/* ConfirmDialog Désactiver */}
      <ConfirmDialog
        open={!!toggleTarget}
        onCancel={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
        title="Désactiver l'utilisateur"
        message={`Êtes-vous sûr de vouloir désactiver le compte de ${toggleTarget?.name} ? Cet utilisateur ne pourra plus se connecter à l'application.`}
        confirmLabel="Désactiver"
        danger
        loading={toggling}
      />
    </div>
  );
}
