import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { Badge, EmptyState, Spinner, SearchInput } from '../components/ui/index';
import { usersApi } from '../api/index';
import { Users, User as UserIcon, Trash2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role?: {
    id?: string;
    name?: string;
  };
  dateCreation?: string;
}

const ROLE_VARIANT: Record<string, 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray'> = {
  ADMINISTRATEUR: 'purple',
  MANAGER: 'blue',
  MAGASINIER: 'green',
};

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const removeUser = async (userId: string) => {
    if (!window.confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return;
    setActionId(userId);
    try {
      await usersApi.delete(userId);
      await load();
    } finally {
      setActionId(null);
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
                <th>Date création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const role = user.role?.name ?? 'INCONNU';
                return (
                  <tr key={user.id} className="table-row">
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge variant={ROLE_VARIANT[role] ?? 'gray'}>{role}</Badge>
                    </td>
                    <td>
                      {user.dateCreation
                        ? new Date(user.dateCreation).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          className="field-select"
                          style={{ width: 170, padding: '5px 10px' }}
                          value={role}
                          disabled={actionId === user.id}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                        >
                          <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="MAGASINIER">MAGASINIER</option>
                        </select>
                        <button
                          className="btn-danger"
                          style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          disabled={actionId === user.id}
                          onClick={() => removeUser(user.id)}
                        >
                          <Trash2 size={14} /> Supprimer
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
    </div>
  );
}
