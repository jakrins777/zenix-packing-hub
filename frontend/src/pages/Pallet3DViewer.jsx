import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

// 📦 2.1 คอมโพเนนต์สำหรับวาดกล่องสินค้าแต่ละใบ
const PackedBox = ({ position, dimensions, boxId }) => {
    // แปลงหน่วยจาก mm เป็น เมตร (Scale down เพื่อความสวยงามในระบบ 3D)
    const w = dimensions.width / 1000;
    const l = dimensions.length / 1000;
    const h = dimensions.height / 1000;

    // พิกัด (Three.js ใช้จุดกึ่งกลางวัตถุเป็นหลัก แต่อัลกอริทึมเริ่มจากมุมกล่อง 
    // จึงต้องขยับแกนช่วยครึ่งหนึ่งของขนาดกล่องเพื่อให้วางตำแหน่งตรงพิกัดเป๊ะๆ)
    const x = position.x / 1000 + w / 2;
    const y = position.y / 1000 + h / 2;
    const z = position.z / 1000 + l / 2;

    // สุ่มสีโทนสว่างเพื่อให้กล่องแต่ละใบสีไม่ซ้ำกัน ดูง่าย
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    return (
        <mesh position={[x, y, z]}>
            <boxGeometry args={[w, h, l]} />
            <meshStandardMaterial color={randomColor} roughness={0.4} />
            {/* ใส่เส้นขอบสีดำให้เห็นขอบกล่องชัดเจนขึ้น */}
            <lineSegments>
                <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(w, h, l)]} />
                <lineBasicMaterial attach="material" color="#000000" linewidth={1} />
            </lineSegments>
        </mesh>
    );
};

// 🪵 2.2 คอมโพเนนต์หลักในการคุมแคนวาส 3Dทั้งหมด
export default function Pallet3DViewer({ palletData }) {
    if (!palletData || !palletData.success) return <p className="p-4 text-gray-500">ยังไม่มีข้อมูลการคำนวณพาเลท</p>;

    const { palletSpecification, packedBoxes } = palletData;

    // แปลงขนาดพาเลทจริงจากหลังบ้าน (mm -> เมตร)
    const pWidth = palletSpecification.totalWidthMm / 1000;
    const pLength = palletSpecification.totalLengthMm / 1000;
    const pBaseThickness = palletSpecification.baseThicknessMm / 1000;

    return (
        <div className="w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden shadow-lg relative">
            <div className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs p-2 rounded backdrop-blur">
                📍 พาเลท: {palletSpecification.palletId} | จัดวางกล่องสำเร็จ: {palletSpecification.totalPackedCount} ใบ
            </div>

            <Canvas camera={{ position: [2, 2, 2], fov: 45 }}>
                {/* แสงสว่างภายใน Scene */}
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 3]} intensity={0.8} castShadow />
                <pointLight position={[-5, 5, -3]} intensity={0.3} />

                {/* 🪵 วาดฐานพาเลท (ยกให้อยู่ใต้กล่องสินค้าพอดี) */}
                <mesh position={[pWidth / 2, -pBaseThickness / 2, pLength / 2]}>
                    <boxGeometry args={[pWidth, pBaseThickness, pLength]} />
                    <meshStandardMaterial color="#8B5A2B" roughness={0.9} /> {/* สีน้ำตาลไม้พาเลท */}
                </mesh>

                {/* 📦 วนลูปวาดกล่องชิ้นงานตามพิกัดที่ดึงมาจาก API */}
                {packedBoxes.map((box, index) => (
                    <PackedBox
                        key={box.boxId || index}
                        position={box.position}
                        dimensions={box.dimensions}
                        boxId={box.boxId}
                    />
                ))}

                {/* เส้นกริดพื้นช่วยให้กะระยะสายตาง่ายขึ้น */}
                <Grid renderOrder={-1} position={[0, -pBaseThickness, 0]} infiniteGrid cellSize={0.5} cellThickness={0.5} sectionSize={2} />

                {/* เครื่องมือที่ทำให้เมาส์คลิกลากหมุน ซูมเข้า-ออกได้แบบอิสระ */}
                <OrbitControls enableDamping dampingFactor={0.05} minDistance={1} maxDistance={10} />
            </Canvas>
        </div>
    );
}