import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { Member, GridDimensions, ZoneTemplate, Base, MapData } from '../types';
import MemberItem from './MemberItem';
import ZoneTemplateItem from './ZoneTemplateItem';

interface SidebarProps {
  members: Member[];
  bases: Base[];
  addMember: (name: string) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (memberId: string, roleName: string, color: string) => void;
  addMarker: (label: string, color: string, x: number, y: number) => void;
  zoneTemplates: ZoneTemplate[];
  addZoneTemplate: (template: Omit<ZoneTemplate, 'id'>) => void;
  removeZoneTemplate: (id: string) => void;
  gridDimensions: GridDimensions;
  setGridDimensions: (dims: GridDimensions) => void;
  allianceName: string;
  setAllianceName: (name: string) => void;
  zoneName: string;
  setZoneName: (name: string) => void;
  clearAll: () => void;
  exportData: () => MapData;
  importData: (data: MapData) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { 
    members, bases, addMember, removeMember, updateMemberRole, addMarker, 
    zoneTemplates, addZoneTemplate, removeZoneTemplate,
    gridDimensions, setGridDimensions,
    allianceName, setAllianceName,
    zoneName, setZoneName,
    clearAll,
    exportData,
    importData
  } = props;

  const [newMemberName, setNewMemberName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Marker state
  const [markerLabel, setMarkerLabel] = useState('');
  const [markerColor, setMarkerColor] = useState('#ef4444');
  const [markerX, setMarkerX] = useState('');
  const [markerY, setMarkerY] = useState('');

  // Zone state
  const [zoneLabel, setZoneLabel] = useState('');
  const [zoneBorderColor, setZoneBorderColor] = useState('#f97316');
  const [zoneBgColor, setZoneBgColor] = useState('rgba(249, 115, 22, 0.2)');
  const [zoneWidth, setZoneWidth] = useState('');
  const [zoneHeight, setZoneHeight] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMember(newMemberName);
    setNewMemberName('');
  };

  const handleGridDimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const numValue = value === '' ? 0 : parseInt(value, 10);
      setGridDimensions({ ...gridDimensions, [name]: numValue });
  };

  const handleAddMarker = (e: React.FormEvent) => {
    e.preventDefault();
    const xCoord = parseInt(markerX, 10);
    const yCoord = parseInt(markerY, 10);
    if (!isNaN(xCoord) && !isNaN(yCoord)) {
      addMarker(markerLabel, markerColor, xCoord, yCoord);
      setMarkerLabel('');
      setMarkerX('');
      setMarkerY('');
    } else {
      alert('有効な座標を入力してください。');
    }
  };

  const handleAddZoneTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const width = parseInt(zoneWidth, 10);
    const height = parseInt(zoneHeight, 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        alert('幅と高さには1以上の有効な数値を入力してください。');
        return;
    }
    
    addZoneTemplate({
        label: zoneLabel,
        width,
        height,
        borderColor: zoneBorderColor,
        bgColor: zoneBgColor,
    });

    setZoneLabel('');
    setZoneWidth('');
    setZoneHeight('');
  };

  // 改善された画像出力関数
  const handleExportImage = async () => {
    setIsExporting(true);
    
    try {
      // 対象要素の取得と存在確認
      const mapElement = document.getElementById('map-content-for-export');
      if (!mapElement) {
        alert('マップ要素が見つかりません。マップが表示されているか確認してください。');
        return;
      }

      console.log('画像出力を開始します...');

      // html2canvasのオプション設定
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1f2937',
        scale: 2, // 高解像度化
        width: mapElement.scrollWidth,
        height: mapElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: mapElement.scrollWidth,
        windowHeight: mapElement.scrollHeight,
        ignoreElements: (element: Element) => {
          // 不要な要素を除外（例：スクロールバーなど）
          return element.classList.contains('ignore-export');
        },
        onclone: (clonedDoc: Document) => {
          // クローンされたドキュメントでのスタイル調整
          const clonedElement = clonedDoc.getElementById('map-content-for-export');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.position = 'static';
          }
        }
      });

      if (!canvas) {
        throw new Error('キャンバスの生成に失敗しました。');
      }

      console.log('キャンバス生成完了、ダウンロードを開始します...');

      // ファイル名の生成（日時を含む）
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const fileName = `${allianceName || 'map'}-${zoneName || 'zone'}-${timestamp}.png`;

      // ダウンロード処理
      const link = document.createElement('a');
      link.download = fileName;
      
      // 高品質なPNG形式で出力
      const dataURL = canvas.toDataURL('image/png', 1.0);
      link.href = dataURL;
      
      // ダウンロード実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('画像出力が完了しました。');
      
    } catch (error) {
      console.error('画像出力エラー:', error);
      alert(`画像出力に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleSaveData = () => {
    const data = exportData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lastwar-map-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadDataClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text);
          importData(data);
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('ファイルの読み込みに失敗しました。有効なJSONファイルではありません。');
      }
    };
    reader.readAsText(file);
    // Reset file input to allow loading the same file again
    event.target.value = '';
  };

  const smallInputClass = "w-full bg-gray-700 text-sm p-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const smallLabelClass = "text-xs text-gray-400";
  
  const placedMemberIds = new Set(bases.map(base => base.member.id));

  return (
    <aside className="w-80 bg-gray-900/50 border-r border-gray-700 p-4 flex flex-col shadow-2xl z-10">
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        
        <div>
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">マップ設定</h2>
          <div className="bg-gray-800 p-3 rounded-lg space-y-3">
              <div>
                  <label className={smallLabelClass}>連盟名</label>
                  <input type="text" value={allianceName} onChange={e => setAllianceName(e.target.value)} className={smallInputClass} />
              </div>
              <div>
                  <label className={smallLabelClass}>戦域名</label>
                  <input type="text" value={zoneName} onChange={e => setZoneName(e.target.value)} className={smallInputClass} />
              </div>
              <div>
                  <label className={smallLabelClass}>グリッド範囲</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                      <input type="number" name="minX" value={gridDimensions.minX} onChange={handleGridDimChange} placeholder="Min X" className={smallInputClass} />
                      <input type="number" name="maxX" value={gridDimensions.maxX} onChange={handleGridDimChange} placeholder="Max X" className={smallInputClass} />
                      <input type="number" name="minY" value={gridDimensions.minY} onChange={handleGridDimChange} placeholder="Min Y" className={smallInputClass} />
                      <input type="number" name="maxY" value={gridDimensions.maxY} onChange={handleGridDimChange} placeholder="Max Y" className={smallInputClass} />
                  </div>
              </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">連盟員リスト</h2>
          <form onSubmit={handleAddMember} className="flex mb-4 gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="新しいメンバー名"
              className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors">追加</button>
          </form>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.length > 0 ? (
              members.map(member => (
                <MemberItem key={member.id} member={member} onRemove={removeMember} onUpdateRole={updateMemberRole} isPlaced={placedMemberIds.has(member.id)} />
              ))
            ) : (
              <p className="text-gray-500 text-sm italic text-center py-4">メンバーを追加してください。</p>
            )}
          </div>
        </div>

         <div>
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">ゾーンテンプレート</h2>
          <div className="bg-gray-800 p-3 rounded-lg">
              <form onSubmit={handleAddZoneTemplate} className="space-y-2">
                  <input type="text" value={zoneLabel} onChange={e => setZoneLabel(e.target.value)} placeholder="ゾーンラベル" className={smallInputClass} />
                  <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={zoneWidth} onChange={e=>setZoneWidth(e.target.value)} placeholder="幅 (セル数)" className={smallInputClass} required/>
                      <input type="number" value={zoneHeight} onChange={e=>setZoneHeight(e.target.value)} placeholder="高さ (セル数)" className={smallInputClass} required/>
                  </div>
                  <div className="flex items-center gap-2">
                      <label className={smallLabelClass}>枠線</label>
                      <input type="color" value={zoneBorderColor} onChange={e => setZoneBorderColor(e.target.value)} className="w-7 h-7 p-0 border-none rounded cursor-pointer bg-gray-700" />
                      <label className={smallLabelClass}>背景</label>
                      <input type="color" value={zoneBgColor} onChange={e => setZoneBgColor(e.target.value)} className="w-7 h-7 p-0 border-none rounded cursor-pointer bg-gray-700" />
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors">テンプレート追加</button>
              </form>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
              {zoneTemplates.map(zt => <ZoneTemplateItem key={zt.id} template={zt} onRemove={removeZoneTemplate} />)}
            </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">マーカー</h2>
          <div className="bg-gray-800 p-3 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm">マーカー設置</h3>
              <form onSubmit={handleAddMarker} className="space-y-2">
                <input type="text" value={markerLabel} onChange={e => setMarkerLabel(e.target.value)} placeholder="ラベル" className={smallInputClass} required />
                <div className="flex items-center gap-2">
                  <input type="color" value={markerColor} onChange={e => setMarkerColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-gray-700" />
                  <input type="number" value={markerX} onChange={e => setMarkerX(e.target.value)} placeholder="X" className="w-1/2" />
                  <input type="number" value={markerY} onChange={e => setMarkerY(e.target.value)} placeholder="Y" className="w-1/2" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors">設置</button>
              </form>
            </div>
        </div>
      </div>

      <div className="flex-shrink-0 pt-4 border-t border-gray-700 space-y-2">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleSaveData} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors">データを保存</button>
          <button onClick={handleLoadDataClick} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">データを読込</button>
        </div>
        <button 
          onClick={handleExportImage} 
          disabled={isExporting}
          className={`w-full font-bold py-2 px-4 rounded transition-colors ${
            isExporting 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-500'
          } text-white`}
        >
          {isExporting ? '出力中...' : '画像として出力'}
        </button>
        <button onClick={clearAll} className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors">配置クリア</button>
      </div>
    </aside>
  );
};

export default Sidebar;