import { useState, useEffect, useRef } from 'react';

/**
 * Reusable modal for text input — replaces window.prompt()
 * Usage:
 *   <Modal
 *     open={true}
 *     title="Buat Playlist Baru"
 *     placeholder="Nama playlist..."
 *     defaultValue=""
 *     onConfirm={(val) => handleCreate(val)}
 *     onClose={() => setOpen(false)}
 *   />
 */
export default function Modal({ open, title, placeholder, defaultValue = '', onConfirm, onClose }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      // Focus input after transition
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleConfirm = () => {
    const trimmed = value.trim();
    onConfirm(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <input
            ref={inputRef}
            className="modal-input"
            type="text"
            placeholder={placeholder || ''}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
            maxLength={100}
          />
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Batal</button>
          <button
            className="modal-btn modal-btn-confirm"
            onClick={handleConfirm}
            disabled={!value.trim()}
          >
            Buat
          </button>
        </div>
      </div>
    </div>
  );
}
