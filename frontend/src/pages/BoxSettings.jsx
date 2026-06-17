import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function BoxSettings() {
  const [boxes, setBoxes] = useState([]);

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    const { data } = await supabase.from('boxes').select('*');
    setBoxes(data);
  };

  const handleUpdate = async (id, field, value) => {
    await supabase.from('boxes').update({ [field]: value }).eq('id', id);
    fetchBoxes();
  };

 return (
    <div className="p-6 bg-[#1C2541] rounded-xl shadow-md border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-white">⚙️ ตั้งชื่อเรียกกล่อง (หน้างาน)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-white/10">
            <tr>
              <th className="pb-3 px-2 text-[#94A3B8] font-bold">รหัสกล่อง</th>
              <th className="pb-3 px-2 text-[#94A3B8] font-bold">ชื่อเรียกหน้างาน (Codename)</th>
              <th className="pb-3 px-2 text-[#94A3B8] font-bold">รายละเอียดทางการ (Formal Desc)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {boxes.map((box) => (
              <tr key={box.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3 font-mono font-bold text-[#00B4D8]">{box.pckId}</td>
                <td className="p-2">
                  <input 
                    className="border border-white/10 bg-[#0B132B] text-white p-2 w-full rounded outline-none focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8] placeholder-[#94A3B8] transition-all"
                    value={box.codename || ''}
                    onChange={(e) => handleUpdate(box.id, 'codename', e.target.value)}
                    placeholder="เช่น กล่อง MC165 ใหญ่"
                  />
                </td>
                <td className="p-2">
                  <input 
                    className="border border-white/10 bg-[#0B132B] text-white p-2 w-full rounded outline-none focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8] placeholder-[#94A3B8] transition-all"
                    value={box.formal_desc || ''}
                    onChange={(e) => handleUpdate(box.id, 'formal_desc', e.target.value)}
                    placeholder="เช่น CARTON BOX L1195..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}