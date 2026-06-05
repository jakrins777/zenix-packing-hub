/* eslint-disable no-unused-vars */
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';

export default function PrintLabelButton({ data }) {
  const componentRef = useRef();
  
  // 🌟 อัปเกรดคำสั่ง: รองรับโครงสร้างทั้ง react-to-print v2 และ v3+ รวดเดียวกันพังครับ
  const handlePrint = useReactToPrint({
    contentRef: componentRef,            // สำหรับ react-to-print v3+ (เวอร์ชันใหม่ล่าสุด)
    content: () => componentRef.current, // สำหรับ react-to-print v2 (เวอร์ชันเก่า)
    documentTitle: `Label_${data?.itemId || 'Product'}`,
  });

  return (
    <>
      {/* ปุ่มกดพิมพ์ฉลาก */}
      <button 
        onClick={handlePrint}
        className="bg-gray-800 text-white hover:bg-black px-3 py-1 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-1"
      >
        <span>🖨️</span> ฉลาก
      </button>

      {/* 🌟 แก้ไขจุดสำคัญ: ย้ายมาซ่อนแบบ Off-screen ดันพิกัดติดลบแทนการใช้คลาส hidden
          เพื่อทำให้ react-to-print สามารถตรวจจับตำแหน่ง DOM และดึงไปคำนวณหน้ากระดาษได้ครับ */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0 }}>
        <div 
          ref={componentRef} 
          className="p-6 bg-white text-black flex flex-col"
          style={{ width: '10cm', height: '10cm', border: '2px solid black' }}
        >
          {/* ส่วนหัวบริษัท */}
          <div className="border-b-4 border-black pb-2 mb-2 text-center">
            <h1 className="text-2xl font-black uppercase tracking-wider">Zenix Aerospace</h1>
            <p className="text-xs font-bold uppercase">Packaging & Logistics</p>
          </div>

          {/* รายละเอียดสินค้า */}
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <p className="text-xs font-bold text-gray-600">PART NUMBER / ITEM CODE</p>
              <p className="text-3xl font-black">{data?.itemId || '-'}</p>
            </div>
            
            <div>
              <p className="text-xs font-bold text-gray-600">DESCRIPTION</p>
              <p className="text-lg font-bold leading-tight line-clamp-2">{data?.itemName || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-2 mt-auto">
              <div>
                <p className="text-xs font-bold text-gray-600">QUANTITY</p>
                <p className="text-2xl font-black">{data?.qty || 0} <span className="text-sm">EA</span></p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600">BOX TYPE</p>
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
               <span>DATE: {new Date().toLocaleDateString('en-GB')}</span>
               <span>OPERATOR: {data?.operator || 'SYS'}</span>
             </div>
          </div>

        </div>
      </div>
    </>
  );
}