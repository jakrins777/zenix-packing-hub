import React, { useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Edges, Html } from '@react-three/drei';

// 📦 คอมโพเนนต์สำหรับวาดกล่องแต่ละใบ (รับ prop เป็น box ทั้งก้อน)
const PackedBox = ({ box }) => {
    const [hovered, setHovered] = useState(false);

    const w = box.dimensions.width / 1000;
    const l = box.dimensions.length / 1000;
    const h = box.dimensions.height / 1000;

    const x = box.position.x / 1000 + w / 2;
    const y = box.position.y / 1000 + h / 2;
    const z = box.position.z / 1000 + l / 2;

    // 🪵 กำหนดโทนสีน้ำตาลกล่องกระดาษคราฟท์ (Cardboard Brown)
    const baseBoxColor = '#8B5A2B';
    const highlightBoxColor = '#A27246';
    const edgeColor = '#5C3A21';

    return (
        <mesh
            position={[x, y, z]}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
        >
            <boxGeometry args={[w, h, l]} />
            <meshStandardMaterial color={hovered ? highlightBoxColor : baseBoxColor} roughness={0.4} opacity={0.95} transparent />
            <Edges linewidth={hovered ? 2 : 1} threshold={15} color={hovered ? "#2D190B" : edgeColor} />

            {/* 🌟 ป้าย Tooltip แบบจัดเต็ม แสดงข้อมูลสินค้าและยอดแพ็ค */}
            {hovered && (
                <Html position={[0, h / 2 + 0.05, 0]} center zIndexRange={[100, 0]}>
                    <div className="bg-slate-900/95 text-white text-xs px-4 py-3 rounded-xl shadow-2xl whitespace-nowrap pointer-events-none border border-amber-600/50 backdrop-blur-md transition-all">
                        <div className="text-amber-400 font-black text-sm mb-2 border-b border-slate-700 pb-2">
                            📦 {box.boxId}
                        </div>
                        <div className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                            <div className="flex justify-between gap-6">
                                <span className="text-slate-400">📐 ขนาด:</span>
                                <span>{box.dimensions.width} x {box.dimensions.length} x {box.dimensions.height} มม.</span>
                            </div>
                            <div className="flex justify-between gap-6">
                                <span className="text-slate-400">🛒 บรรจุ:</span>
                                <span className="text-emerald-400 font-bold text-xs">{box.packedQty || 0} / {box.itemCap || 0} ชิ้น</span>
                            </div>
                            <div className="flex justify-between gap-6">
                                <span className="text-slate-400">⚖️ น้ำหนักรวม:</span>
                                <span>{box.weight || 0} kg</span>
                            </div>
                        </div>
                    </div>
                </Html>
            )}
        </mesh>
    );
};

// 🏭 คอมโพเนนต์หลักสำหรับวาดพาเลทและกล่องทั้งหมด
export default function Pallet3DViewer({ palletData }) {
    if (!palletData || !palletData.success) {
        return (
            <div className="w-full h-[400px] flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold">
                📦 กรุณาเลือกพาเลทและกดคำนวณเพื่อดูภาพ 3 มิติ
            </div>
        );
    }

    const { palletSpecification, packedBoxes } = palletData;
    const pWidth = palletSpecification.totalWidthMm / 1000;
    const pLength = palletSpecification.totalLengthMm / 1000;
    const pBaseThickness = palletSpecification.baseThicknessMm / 1000;

    return (
        <div className="w-full h-[500px] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 cursor-crosshair">

            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-bold text-slate-800 shadow-sm border border-slate-200">
                📍 พาเลท: {palletSpecification.palletId} | วางสำเร็จ: {palletSpecification.totalPackedCount} ใบ
            </div>

            <Canvas camera={{ position: [2.5, 2.5, 2.5], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
                <pointLight position={[-5, 5, -5]} intensity={0.4} />

                {/* 🪵 ฐานพาเลท */}
                <mesh position={[pWidth / 2, -pBaseThickness / 2, pLength / 2]}>
                    <boxGeometry args={[pWidth, pBaseThickness, pLength]} />
                    <meshStandardMaterial color="#DEB887" roughness={0.6} />
                    <Edges linewidth={1.5} color="#A0845C" />
                </mesh>

                {/* 📦 กล่องสินค้าสีน้ำตาล (ส่ง prop box เข้าไปทั้งก้อน) */}
                {packedBoxes.map((box, index) => (
                    <PackedBox key={box.boxId || index} box={box} />
                ))}

                {/* เส้นตารางพื้น */}
                <Grid renderOrder={-1} position={[0, -pBaseThickness, 0]} infiniteGrid cellSize={0.5} cellThickness={0.5} sectionSize={2} sectionColor="#CBD5E1" fadeDistance={20} />
                <OrbitControls enableDamping dampingFactor={0.05} minDistance={1.5} maxDistance={15} target={[pWidth / 2, 0.5, pLength / 2]} />
            </Canvas>
        </div>
    );
}