/* eslint-disable no-unused-vars */
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { useTranslation } from 'react-i18next'; // 🌟 Import เครื่องมือแปลภาษา

export default function PrintLabelButton({ data }) {
  const { t } = useTranslation(); // 🌟 เรียกใช้งาน Hook แปลภาษา
  const componentRef = useRef();
  
  // 🌟 อัปเกรดคำสั่ง: รองรับโครงสร้างทั้ง react-to-print v2 และ v3+ รวดเดียวกันพังครับ
  const handlePrint = useReactToPrint({
    contentRef: componentRef,            // สำหรับ react-to-print v3+ (เวอร์ชันใหม่ล่าสุด)
    content: () => componentRef.current, // สำหรับ react-to-print v2 (เวอร์ชันเก่า)
    documentTitle: `Label_${data?.itemId || t('print_label.default_product')}`,
  });

 return (
    <>
      {/* ปุ่มกดพิมพ์ฉลาก (ปรับสีเป็นธีม Zenix) */}
      <button 
        onClick={handlePrint}
        className="bg-[#00B4D8] hover:bg-[#0096B4] text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-1"
      >
        <span>🖨️</span> {t('print_label.btn_text')}
      </button>

      {/* 🌟 หน้ากระดาษสำหรับปริ้น (ต้องเป็นขาว-ดำ เท่านั้น เพื่อให้เครื่องปริ้นสติกเกอร์ Thermal อ่านบาร์โค้ดได้ชัดเจน) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0 }}>
        <div 
          ref={componentRef} 
          className="p-6 bg-white text-black flex flex-col"
          style={{ width: '10cm', height: '10cm', border: '2px solid black' }}
        >
          {/* ส่วนหัวบริษัท */}
          <div className="border-b-4 border-black pb-2 mb-2 text-center">
            <h1 className="text-2xl font-black uppercase tracking-wider">Zenix Aerospace</h1>
            <p className="text-xs font-bold uppercase">{t('print_label.sub_brand')}</p>
          </div>

          {/* รายละเอียดสินค้า */}
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <p className="text-xs font-bold text-gray-600">{t('print_label.part_number')}</p>
              <p className="text-3xl font-black">{data?.itemId || '-'}</p>
            </div>
            
            <div>
              <p className="text-xs font-bold text-gray-600">{t('print_label.description')}</p>
              <p className="text-lg font-bold leading-tight line-clamp-2">{data?.itemName || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-2 mt-auto">
              <div>
                <p className="text-xs font-bold text-gray-600">{t('print_label.quantity')}</p>
                <p className="text-2xl font-black">{data?.qty || 0} <span className="text-sm">EA</span></p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600">{t('print_label.box_type')}</p>
                <p className="text-xl font-black">{data?.boxType || '-'}</p>
              </div>
            </div>
          </div>

          {/* บาร์โค้ด และ ข้อมูลผู้แพ็ค */}
          <div className="border-t-4 border-black pt-2 mt-2 flex flex-col items-center">
             {data?.itemId && (
               <Barcode 
                 value={data.itemId} 
                 width={1.8} 
                 height={40} 
                 fontSize={14}
                 margin={0}
                 displayValue={true} 
               />
             )}
             <div className="w-full flex justify-between mt-2 text-[10px] font-bold uppercase">
               <span>{t('print_label.date')}: {new Date().toLocaleDateString('en-GB')}</span>
               <span>{t('print_label.operator')}: {data?.operator || t('print_label.sys')}</span>
             </div>
          </div>

        </div>
      </div>
    </>
  );
}