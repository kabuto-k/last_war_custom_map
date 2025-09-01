import React, { useState } from 'react';
import type { Member } from '../types';
import { ItemType } from '../types';

interface MemberItemProps {
  member: Member;
  onRemove: (id: string) => void;
  onUpdateRole: (memberId: string, roleName: string, color: string) => void;
  isPlaced: boolean;
}

const MemberItem: React.FC<MemberItemProps> = ({ member, onRemove, onUpdateRole, isPlaced }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [roleName, setRoleName] = useState(member.role?.name || '');
  const [roleColor, setRoleColor] = useState(member.role?.color || '#ffffff');

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const data = JSON.stringify({ type: ItemType.MEMBER, payload: member });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRoleSave = () => {
    onUpdateRole(member.id, roleName, roleColor);
    setIsEditing(false);
  };

  return (
    <div className={`rounded transition-colors shadow flex flex-col ${isPlaced ? 'bg-gray-800/70' : 'bg-gray-700'}`}>
      <div className="p-2 flex justify-between items-center">
        <div 
          draggable 
          onDragStart={handleDragStart}
          className="flex-grow flex items-center cursor-move"
          aria-label={`Draggable member: ${member.name}`}
        >
            {member.role && <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: member.role.color }}></span>}
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${isPlaced ? 'text-gray-400' : 'text-white'}`}>{member.name}</span>
              {member.role?.name && (
                <span className="text-xs font-semibold" style={{ color: member.role.color }}>
                  {member.role.name}
                </span>
              )}
            </div>
            {isPlaced && <span className="ml-auto text-xs text-cyan-400 bg-cyan-900/50 px-1.5 py-0.5 rounded-full font-semibold">配置済み</span>}
        </div>
        <div className="flex items-center pl-2">
            <button onClick={() => setIsEditing(!isEditing)} className="text-gray-400 hover:text-cyan-400 text-sm px-2" aria-label="Edit role">
                {isEditing ? '▼' : '▶'}
            </button>
            <button 
                onClick={() => onRemove(member.id)} 
                className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none"
                aria-label={`Remove ${member.name}`}
            >
                &times;
            </button>
        </div>
      </div>
      {isEditing && (
        <div className="p-2 border-t border-gray-600 space-y-2">
            <p className="text-xs text-gray-400">役割設定</p>
            <input type="text" placeholder="役割名 (例: 防衛)" value={roleName} onChange={e => setRoleName(e.target.value)} className="w-full bg-gray-800 text-sm p-1 rounded border border-gray-600" />
            <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">色:</label>
                <input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)} className="w-7 h-7 p-0 border-none rounded cursor-pointer bg-gray-800" />
            </div>
            <button onClick={handleRoleSave} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1 px-2 rounded text-sm transition-colors">
                保存
            </button>
        </div>
      )}
    </div>
  );
};

export default MemberItem;