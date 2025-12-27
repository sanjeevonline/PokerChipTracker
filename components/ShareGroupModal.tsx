
import React, { useState } from 'react';
import { Group } from '../types';
import { Modal, Button, Input } from './UI';
import { AlertCircle, HelpCircle, Loader2, Plus, X } from 'lucide-react';
import { api } from '../services/gameService';

interface ShareGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  session: any;
  onGroupUpdated: (group: Group) => void;
}

export const ShareGroupModal: React.FC<ShareGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  session,
  onGroupUpdated
}) => {
  const [shareEmail, setShareEmail] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!group) return null;

  const handleAddShareEmail = async () => {
    if (!group || !shareEmail.trim()) return;

    setShareError(null);
    const emailToAdd = shareEmail.trim().toLowerCase();

    if (emailToAdd === session?.user?.email?.toLowerCase()) {
      setShareError("You cannot share a group with yourself.");
      return;
    }

    const currentEmails = group.sharedWithEmails || [];
    if (currentEmails.includes(emailToAdd)) {
      setShareEmail('');
      return;
    }

    setIsSharing(true);
    try {
      const exists = await api.checkUserExistsByEmail(emailToAdd);

      if (!exists) {
        setShareError(`No ChipTracker user found with "${emailToAdd}".`);
        setIsSharing(false);
        return;
      }

      const updatedGroup = {
        ...group,
        sharedWithEmails: [...currentEmails, emailToAdd]
      };

      await api.saveGroup(updatedGroup);
      onGroupUpdated(updatedGroup);
      setShareEmail('');
    } catch (e: any) {
      setShareError(e.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShareEmail = async (email: string) => {
    if (!group) return;
    const updatedGroup = {
      ...group,
      sharedWithEmails: (group.sharedWithEmails || []).filter(e => e !== email)
    };
    try {
      await api.saveGroup(updatedGroup);
      onGroupUpdated(updatedGroup);
    } catch (e: any) {
      setShareError(e.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${group?.name}"`}>
      <div className="space-y-6">
        {shareError && (
          <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-200">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80 leading-relaxed">{shareError}</p>
          </div>
        )}
        <div className="flex items-start gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
          <HelpCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-400 leading-relaxed">Enter the email of the person you want to collaborate with.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Collaborator's Email" type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} disabled={isSharing} />
          <Button onClick={handleAddShareEmail} icon={isSharing ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} disabled={isSharing}>Add</Button>
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Members</h4>
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden shadow-inner">
            {group?.sharedWithEmails?.map(email => (
              <div key={email} className="p-3 flex items-center justify-between group">
                <div className="text-sm font-medium text-neutral-200">{email}</div>
                {group?.ownerId === session?.user?.id && (
                  <button onClick={() => handleRemoveShareEmail(email)} className="p-2 text-neutral-500 hover:text-red-500 rounded-lg"><X size={16} /></button>
                )}
              </div>
            ))}
            {(group?.sharedWithEmails?.length || 0) === 0 && (
              <div className="p-4 text-center text-neutral-600 text-xs italic">No collaborators yet.</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
