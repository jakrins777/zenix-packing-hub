import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function BoxSettings() {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา
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
      <h2 className="text-xl font-bold mb-4">{t('box_settings.title')}</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">{t('box_settings.box_id')}</th>
            <th className="text-left">{t('box_settings.codename')}</th>
            <th className="text-left">{t('box_settings.formal_desc')}</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((box) => (
            <tr key={box.id}>
              <td className="p-2 font-mono">{box.pckId}</td>
              <td className="p-2">
                <input 
                  className="border p-1 w-full rounded"
                  value={box.codename || ''}
                  onChange={(e) => handleUpdate(box.id, 'codename', e.target.value)}
                  placeholder={t('box_settings.placeholder_codename')}
                />
              </td>
              <td className="p-2">
                <input 
                  className="border p-1 w-full rounded"
                  value={box.formal_desc || ''}
                  onChange={(e) => handleUpdate(box.id, 'formal_desc', e.target.value)}
                  placeholder={t('box_settings.placeholder_formal_desc')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}