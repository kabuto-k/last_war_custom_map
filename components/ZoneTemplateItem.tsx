import React from 'react';
import type { ZoneTemplate } from '../types';
import { ItemType } from '../types';

interface ZoneTemplateItemProps {
  template: ZoneTemplate;
  onRemove: (id: string) => void;
}

const ZoneTemplateItem: React.FC<ZoneTemplateItemProps> = ({ template, onRemove }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const data = JSON.stringify({ type: ItemType.ZONE_TEMPLATE, payload: template });
        e.dataTransfer.setData('application/json', data);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="bg-gray-700 rounded p-2 flex justify-between items-center hover:bg-gray-600 transition-colors shadow">
            <div draggable onDragStart={handleDragStart} className="flex-grow flex items-center cursor-move">
                <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: template.bgColor, border: `2px solid ${template.borderColor}` }}></div>
                <span className="text-sm font-medium">{template.label || '無題ゾーン'} ({template.width}x{template.height})</span>
            </div>
            <button 
                onClick={() => onRemove(template.id)} 
                className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none"
                aria-label={`Remove template ${template.label}`}
            >
                &times;
            </button>
        </div>
    );
}

export default ZoneTemplateItem;
