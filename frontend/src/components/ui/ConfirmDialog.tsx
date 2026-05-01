import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="btn-secondary" onClick={onCancel} disabled={loading}>
          Annuler
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary-sm'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
