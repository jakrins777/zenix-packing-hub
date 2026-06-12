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
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">⚙️ ตั้งชื่อเรียกกล่อง (หน้างาน)</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th>รหัสกล่อง</th>
            <th>ชื่อเรียกหน้างาน (Codename)</th>
            <th>รายละเอียดทางการ (Formal Desc)</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((box) => (
            <tr key={box.id}>
              <td className="p-2 font-mono">{box.pckId}</td>
              <td className="p-2">
                <input 
                  className="border p-1 w-full"
                  value={box.codename || ''}
                  onChange={(e) => handleUpdate(box.id, 'codename', e.target.value)}
                  placeholder="เช่น กล่อง MC165 ใหญ่"
                />
              </td>
              <td className="p-2">
                <input 
                  className="border p-1 w-full"
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
  );
}