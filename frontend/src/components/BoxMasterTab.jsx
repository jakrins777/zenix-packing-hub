import React from 'react';
import BoxCodenameUpdater from './BoxCodenameUpdater';

export default function BoxMasterTab({
    t, boxes, palletsList, boxForm, setBoxForm, editingBoxId, setEditingBoxId,
    handleBoxSubmit, handleBoxDelete, boxSearchTerm, setBoxSearchTerm, boxSortBy,
    setBoxSortBy, processedBoxes, handleBoxFileUpload, handleExportBoxes, refreshAdminData
}) {
    return (
        <div className="flex flex-col space-y-8 print:hidden">
            <BoxCodenameUpdater boxes={boxes} fetchAdminData={refreshAdminData} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                <div className="space-y-6 h-fit print:hidden">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg text-gray-800">
                        <h3 className="text-xl font-black text-[#0066CC] mb-4">{editingBoxId ? t('box.edit_title') : t('box.add_title')}</h3>
                        <form onSubmit={handleBoxSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">{t('box.id')}</label>
                                <input type="text" required disabled={!!editingBoxId} value={boxForm.pckId || ''} onChange={(e) => setBoxForm(prev => ({ ...prev, pckId: String(e.target.value).toUpperCase() }))} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800 disabled:bg-gray-100 disabled:text-gray-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-[#0066CC]">{t('box.codename')}</label>
                                <input type="text" value={boxForm.codename || ''} onChange={(e) => setBoxForm({ ...boxForm, codename: e.target.value })} className="w-full p-3 border border-blue-200 rounded-lg bg-blue-50 outline-none text-gray-800 focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] placeholder-gray-400" placeholder={t('box.codename_placeholder')} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">{t('box.desc')}</label>
                                <input type="text" required value={boxForm.description || ''} onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">{t('box.capacity')}</label>
                                    <input type="number" required value={boxForm.maxCapacity || ''} onChange={(e) => setBoxForm({ ...boxForm, maxCapacity: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#0066CC] mb-1">{t('box.stock')}</label>
                                    <input type="number" required value={boxForm.currentStock || 0} onChange={(e) => setBoxForm({ ...boxForm, currentStock: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] font-bold bg-white text-[#0066CC]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-amber-600 mb-1">🪵 ผูกกับพาเลท (Pallet Binding)</label>
                                <select value={boxForm.boundPalletId || ''} onChange={(e) => setBoxForm({ ...boxForm, boundPalletId: e.target.value || null })} className="w-full p-3 border border-amber-200 rounded-lg bg-amber-50 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-800 font-medium">
                                    <option value="">-- ไม่ผูกพาเลท (ให้ระบบสุ่มหาให้อัตโนมัติ) --</option>
                                    {palletsList?.map(p => (
                                        <option key={p.palletId} value={p.palletId}>{p.palletId} ({p.description})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex space-x-2 pt-4">
                                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold py-3 px-4 rounded-lg shadow-sm">{t('common.save')}</button>
                                {editingBoxId && <button type="button" onClick={() => { setEditingBoxId(null); setBoxForm({ pckId: '', codename: '', description: '', maxCapacity: '', currentStock: 0, boundPalletId: null }); }} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors">{t('common.cancel')}</button>}
                            </div>
                        </form>
                    </div>
                    {!editingBoxId && (
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                            <h3 className="text-lg font-black text-[#0066CC] mb-3 flex items-center gap-2">{t('box.import_excel')}</h3>
                            <div className="space-y-3">
                                <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleBoxFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#0066CC] file:text-white hover:file:bg-[#0052a3] cursor-pointer transition-all" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2 flex flex-col h-full print:block print:h-auto print:w-full">
                    <div className="hidden print:block mb-8 text-center text-black pt-4">
                        <h1 className="text-3xl font-black mb-2">{t('box.report_title')}</h1>
                        <p className="text-gray-600 font-medium">{t('box.report_date')} {new Date().toLocaleDateString('th-TH')} {t('box.report_time')} {new Date().toLocaleTimeString('th-TH')}</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 mb-6 rounded-2xl border border-gray-200 shadow-sm print:hidden">
                        <div className="lg:col-span-5 w-full flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 focus-within:border-[#0066CC] focus-within:ring-1 focus-within:ring-[#0066CC] transition-all">
                            <input type="text" placeholder={t('box.search_placeholder')} value={boxSearchTerm} onChange={(e) => setBoxSearchTerm(e.target.value)} className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400" />
                            {boxSearchTerm && <button onClick={() => setBoxSearchTerm('')} className="text-gray-400 hover:text-red-500 font-bold ml-2">X</button>}
                        </div>
                        <div className="lg:col-span-7 flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full text-gray-700">
                            <div className="flex items-center gap-2">
                                <label className="font-bold text-sm whitespace-nowrap">{t('common.sort_by')}</label>
                                <select value={boxSortBy} onChange={(e) => setBoxSortBy(e.target.value)} className="p-2.5 w-auto min-w-[140px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                                    <option value="id_asc">{t('sort.id_asc')}</option>
                                    <option value="id_desc">{t('sort.id_desc')}</option>
                                    <option value="desc_asc">{t('sort.desc_asc')}</option>
                                    <option value="desc_desc">{t('sort.desc_desc')}</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2 whitespace-nowrap">
                                    {t('box.print_stock')}
                                </button>
                                <button onClick={handleExportBoxes} className="bg-white hover:bg-blue-50 text-[#0066CC] font-bold py-2.5 px-4 rounded-lg border border-[#0066CC] transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">
                                    {t('common.download_template')}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 flex-1 shadow-sm bg-white print:overflow-visible print:border-gray-400 print:shadow-none print:block">
                        <table className="min-w-full print:bg-white print:text-black">
                            <thead className="bg-gray-50 border-b border-gray-200 print:bg-gray-200 print:border-gray-400">
                                <tr>
                                    <th className="py-4 px-4 text-left text-gray-600 print:text-black font-bold uppercase tracking-wider text-sm border-r border-transparent print:border-gray-300">{t('table.box_id')}</th>
                                    <th className="py-4 px-4 text-left text-gray-600 print:text-black font-bold uppercase tracking-wider text-sm border-r border-transparent print:border-gray-300">{t('table.box_desc')}</th>
                                    <th className="py-4 px-4 text-center text-gray-600 print:text-black font-bold uppercase tracking-wider text-sm border-r border-transparent print:border-gray-300">{t('table.box_stock')}</th>
                                    <th className="py-4 px-4 text-center text-gray-600 print:hidden font-bold uppercase tracking-wider text-sm">{t('table.action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                                {processedBoxes.length > 0 ? (
                                    processedBoxes.map(box => {
                                        const id = box?.pckId || box?.pckid;
                                        return (
                                            <tr key={id} className="hover:bg-gray-50 print:hover:bg-transparent transition-colors print:break-inside-avoid">
                                                <td className="py-3 px-4 font-mono font-black text-[#0066CC] print:text-black border-r border-transparent print:border-gray-300">{id}</td>
                                                <td className="py-3 px-4 text-gray-800 print:text-black font-medium text-sm border-r border-transparent print:border-gray-300">
                                                    {box?.description || '-'}
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        {box?.codename && <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded font-bold">{t('box.codename_label')} {box.codename}</span>}
                                                        {box?.boundPalletId && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded font-bold">🪵 พาเลท: {box.boundPalletId}</span>}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center border-r border-transparent print:border-gray-300">
                                                    <span className="font-black text-2xl text-[#0066CC] print:text-black">{box?.currentStock || 0}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap print:hidden">
                                                    <button onClick={() => { setEditingBoxId(id); setBoxForm({ pckId: id, codename: box.codename || '', description: box.description, maxCapacity: box.maxCapacity, currentStock: box.currentStock || 0, boundPalletId: box.boundPalletId || null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white border border-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.edit')}</button>
                                                    <button onClick={() => handleBoxDelete(id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.delete')}</button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr><td colSpan="4" className="py-8 text-center text-gray-400 font-bold">{t('table.no_box_data')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}