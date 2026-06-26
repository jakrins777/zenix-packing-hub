import React from 'react';
import { Search } from 'lucide-react';

export default function ItemMasterTab({
    t, itemForm, setItemForm, editingItemId, setEditingItemId, handleItemSubmit, handleLoadItemTemplate,
    boxes, handleFileUpload, handleImportStocksExcel, handleCombineExcelToCSV, searchTerm, setSearchTerm,
    setCurrentPage, filterCustomer, setFilterCustomer, uniqueCustomers, filterBoxStatus, setFilterBoxStatus,
    sortBy, setSortBy, handleExportItems, currentItems, selectedItemIds, filteredData, handleSelectAllPages,
    handleClearSelection, bulkForm, setBulkForm, handleBulkUpdateSubmit, handleBulkDeleteSubmit,
    handleExportSelectedItems, setSelectedItemIds, handleSelectAllCurrentPage, handleSelectItem,
    handleDeleteItem, indexOfFirstItem, indexOfLastItem, currentPage, totalPages
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6 h-fit">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg text-gray-800">
                    <h3 className="text-xl font-black text-[#0066CC] mb-4">{editingItemId ? t('item.edit_title') : t('item.add_title')}</h3>
                    <form onSubmit={handleItemSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">
                                {t('item.id')} <span className="text-xs text-[#0066CC] font-normal ml-1">(พิมพ์รหัสแล้วกดค้นหา)</span>
                            </label>
                            <div className="relative">
                                <input type="text" required disabled={!!editingItemId} value={itemForm.itemId || ''} onChange={(e) => setItemForm(prev => ({ ...prev, itemId: String(e.target.value).toUpperCase() }))} className="w-full p-3 pr-12 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all disabled:bg-gray-100" />
                                {!editingItemId && (
                                    <button type="button" onClick={handleLoadItemTemplate} className="absolute right-2 top-2 p-1.5 bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white rounded-md transition-colors" title="โหลดข้อมูลเทมเพลต">
                                        <Search size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('item.name')}</label><input type="text" value={itemForm.itemName || ''} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('item.customer')}</label><input type="text" value={itemForm.supplier || ''} onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('item.weight')}</label><input type="number" step="0.001" required value={itemForm.itemWeight || ''} onChange={(e) => setItemForm({ ...itemForm, itemWeight: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                            <div><label className="block text-sm font-bold text-[#0066CC] mb-1">{t('item.qty_per_box')}</label><input type="number" required min="1" value={itemForm.stdPackQty || ''} onChange={(e) => setItemForm({ ...itemForm, stdPackQty: parseInt(e.target.value) || 1 })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all" /></div>
                            <div><label className="block text-sm font-bold text-amber-600 mb-1">กล่อง/ชิ้น</label><input type="number" required min="1" value={itemForm.boxesPerUnit || 1} onChange={(e) => setItemForm({ ...itemForm, boxesPerUnit: parseInt(e.target.value) || 1 })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">{t('item.default_box')}</label>
                            <select value={itemForm.defaultPckId || ''} onChange={(e) => setItemForm({ ...itemForm, defaultPckId: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] transition-all">
                                <option value="" className="text-gray-500">{t('item.select_box')}</option>
                                {[...(boxes || [])].sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, { numeric: true })).map(b => {
                                    const id = b.pckId || b.pckid;
                                    return id ? <option key={id} value={id} className="text-gray-800">{id} {b.codename ? `(${b.codename})` : ''}</option> : null;
                                })}
                            </select>
                        </div>
                        <div className="flex space-x-2 pt-4">
                            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all">{t('common.save')}</button>
                            {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setItemForm({ itemId: '', itemName: '', supplier: '', itemWeight: '', defaultPckId: '', stdPackQty: 1, boxesPerUnit: 1 }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-all">{t('common.cancel')}</button>}
                        </div>
                    </form>
                </div>

                {!editingItemId && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                            <h3 className="text-sm font-black text-[#0066CC] mb-3 flex items-center gap-2">{t('item.import_master_data')}</h3>
                            <input type="file" id="items-file-input" accept=".xlsx, .xls, .csv" multiple onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0066CC] file:text-white hover:file:bg-[#0052a3] cursor-pointer transition-all" />
                        </div>
                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                            <h3 className="text-sm font-black text-amber-700 mb-3 flex items-center gap-2"><span>📦</span> {t('item.update_stock_import')}</h3>
                            <label className="cursor-pointer w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                                <span>📥</span> {t('item.stock_upload_file')}
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportStocksExcel} className="hidden" />
                            </label>
                            <div className="text-[10px] text-amber-600/80 text-center mt-2 font-medium">*{t('item.stock_upload_file_desc')}</div>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm mt-4">
                            <h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2"><span>🛠️</span> เครื่องมือ: รวมไฟล์ Excel หลายไฟล์เป็น CSV</h3>
                            <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleCombineExcelToCSV} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-700 file:text-white hover:file:bg-gray-800 cursor-pointer transition-all" />
                            <div className="text-[10px] text-gray-500 text-center mt-2 font-medium">*เลือกไฟล์ได้หลายไฟล์ ระบบจะรวมแล้วดาวน์โหลดลงเครื่องทันที</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-2 w-full min-w-0 flex flex-col h-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 mb-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="lg:col-span-4 w-full flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 focus-within:border-[#0066CC] focus-within:ring-1 focus-within:ring-[#0066CC] transition-all">
                        <input type="text" placeholder={t('item.search_placeholder')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400" />
                        {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-gray-400 hover:text-red-500 font-bold ml-2">X</button>}
                    </div>
                    <div className="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-3 text-gray-700 w-full">
                        <div className="flex items-center gap-2">
                            <label className="font-bold text-sm whitespace-nowrap">{t('item.filter_customer')}</label>
                            <select value={filterCustomer} onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }} className="p-2.5 w-auto min-w-[120px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                                {uniqueCustomers.map((cust, idx) => <option key={idx} value={cust}>{cust === 'All' ? t('item.filter_all') : cust}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="font-bold text-sm whitespace-nowrap">{t('item.filter_box')}</label>
                            <select value={filterBoxStatus} onChange={(e) => { setFilterBoxStatus(e.target.value); setCurrentPage(1); }} className="p-2.5 w-auto min-w-[120px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                                <option value="All">{t('item.filter_all')}</option>
                                <option value="NoBox">{t('item.filter_no_box')}</option>
                                <option value="HasBox">{t('item.filter_has_box')}</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="font-bold text-sm whitespace-nowrap">{t('common.sort_by')}</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2.5 w-auto min-w-[120px] border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC] outline-none text-sm font-medium bg-white text-gray-800">
                                <option value="id_asc">{t('sort.id_asc')}</option>
                                <option value="id_desc">{t('sort.id_desc')}</option>
                                <option value="name_asc">{t('sort.name_asc')}</option>
                                <option value="name_desc">{t('sort.name_desc')}</option>
                            </select>
                        </div>
                        <button onClick={handleExportItems} className="bg-white hover:bg-gray-50 text-[#0066CC] font-bold py-2.5 px-4 rounded-lg border border-[#0066CC] transition-all flex items-center gap-2 whitespace-nowrap shadow-sm">{t('common.download_template')}</button>
                    </div>
                </div>

                {currentItems.length > 0 && currentItems.every(item => selectedItemIds.includes(item.itemId || item.itemid)) && selectedItemIds.length < filteredData.length && (
                    <div className="bg-[#0066CC]/10 border border-[#0066CC]/20 text-[#0066CC] px-4 py-3 rounded-lg mb-4 text-center text-sm flex items-center justify-center gap-2 animate-fade-in">
                        <span>ระบบได้เลือก <strong>{selectedItemIds.length}</strong> รายการที่แสดงผลอยู่แล้ว</span><span className="text-gray-400">|</span>
                        <button onClick={handleSelectAllPages} className="font-black hover:text-[#0052a3] hover:underline transition-all">คลิกที่นี่เพื่อเลือกทั้งหมด {filteredData.length} รายการ (ทุกหน้า)</button>
                    </div>
                )}

                {selectedItemIds.length === filteredData.length && filteredData.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-center text-sm font-bold flex items-center justify-center gap-2 animate-fade-in">
                        ✅ เลือกข้อมูลครบทั้ง {filteredData.length} รายการแล้ว <button onClick={handleClearSelection} className="text-xs ml-2 text-emerald-600 hover:text-emerald-800 underline font-normal">ยกเลิกการเลือก</button>
                    </div>
                )}

                {selectedItemIds.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-gray-800 shadow-sm transition-all animate-fadeIn">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-amber-900">{t('bulk.selected')} <span className="text-xl font-black text-amber-600">{selectedItemIds.length}</span> {t('bulk.items')}</p>
                                <p className="text-xs text-amber-700/70 mt-0.5">{t('bulk.hint')}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <input type="text" placeholder={t('bulk.change_customer')} value={bulkForm.supplier} onChange={(e) => setBulkForm({ ...bulkForm, supplier: e.target.value })} className="p-2 border border-amber-300 rounded-lg bg-white text-sm text-gray-800 outline-none w-40 focus:ring-1 focus:ring-amber-500 focus:border-amber-500" />
                                <select value={bulkForm.defaultPckId} onChange={(e) => setBulkForm({ ...bulkForm, defaultPckId: e.target.value })} className="p-2 border border-amber-300 rounded-lg bg-white text-sm text-gray-800 outline-none w-auto max-w-[250px] focus:ring-1 focus:ring-amber-500 focus:border-amber-500">
                                    <option value="">{t('bulk.change_box')}</option>
                                    {[...(boxes || [])].sort((a, b) => String(a.pckId || a.pckid || '').localeCompare(String(b.pckId || b.pckid || ''), undefined, { numeric: true })).map(b => {
                                        const id = b.pckId || b.pckid;
                                        return id ? <option key={id} value={id}>{id} {b.codename ? `(${b.codename})` : ''}</option> : null;
                                    })}
                                </select>
                                <div className="flex gap-2">
                                    <button onClick={handleBulkUpdateSubmit} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm transition-colors">{t('bulk.update_btn')}</button>
                                    <button onClick={handleBulkDeleteSubmit} className="bg-red-100 hover:bg-red-500 text-red-600 hover:text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm transition-colors">{t('bulk.delete_btn')}</button>
                                    <button onClick={handleExportSelectedItems} className="bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-sm py-2 px-4 rounded-lg shadow-sm transition-colors">{t('bulk.download_btn')}</button>
                                    <button onClick={() => setSelectedItemIds([])} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold py-2 px-3 rounded-lg">X {t('bulk.cancel_btn')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full overflow-x-auto rounded-xl border border-gray-200 flex-1 shadow-sm bg-white custom-scrollbar">
                    <table className="w-full min-w-[1000px] divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="py-4 px-4 text-center w-12"><input type="checkbox" className="w-4 h-4 accent-[#0066CC] rounded cursor-pointer" checked={currentItems.length > 0 && currentItems.map(item => item.itemId || item.itemid).every(id => selectedItemIds.includes(id))} onChange={handleSelectAllCurrentPage} /></th>
                                <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.item_id')}</th>
                                <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.item_name')}</th>
                                <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.customer')}</th>
                                <th className="py-4 px-4 text-left text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap">{t('table.std_box')}</th>
                                <th className="py-4 px-4 text-center text-gray-600 font-bold uppercase tracking-wider text-sm whitespace-nowrap w-40">{t('table.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentItems.length > 0 ? (
                                currentItems.map(item => {
                                    const id = item.itemId || item.itemid;
                                    const name = item.itemName || item.itemname;
                                    const isChecked = selectedItemIds.includes(id);
                                    return (
                                        <tr key={id} className={`transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                            <td className="py-3 px-4 text-center"><input type="checkbox" className="w-4 h-4 accent-[#0066CC] rounded cursor-pointer" checked={isChecked} onChange={() => handleSelectItem(id)} /></td>
                                            <td className="py-3 px-4 font-mono font-black text-[#0066CC] whitespace-nowrap">{id}</td>
                                            <td className="py-3 px-4 text-sm font-bold text-gray-800">{name}</td>
                                            <td className="py-3 px-4 text-gray-500 font-medium text-sm whitespace-nowrap">{item.supplier || '-'}</td>
                                            <td className="py-3 px-4 text-sm whitespace-nowrap">
                                                <div className="font-bold text-gray-800 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md inline-block mr-2">{item.defaultPckId || '-'}</div>
                                                <span className="text-xs text-[#0066CC] font-bold bg-blue-50 border border-blue-100 px-2 py-1 rounded mr-2">{t('common.capacity')} {item.stdPackQty || 1}</span>
                                                {(item.boxesPerUnit && item.boxesPerUnit > 1) && <span className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded">📦 แยก {item.boxesPerUnit} กล่อง</span>}
                                            </td>
                                            <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                                                <button onClick={() => { setEditingItemId(id); setItemForm({ itemId: id, itemName: name, supplier: item.supplier, itemWeight: item.itemWeight, defaultPckId: item.defaultPckId || '', stdPackQty: item.stdPackQty || 1, boxesPerUnit: item.boxesPerUnit || 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white border border-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.edit_light')}</button>
                                                <button onClick={() => handleDeleteItem(id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.delete')}</button>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr><td colSpan="6" className="py-8 text-center text-gray-400 font-bold">{t('table.no_data')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredData.length > 0 && (
                    <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-gray-600">
                        <div className="text-sm font-medium">{t('pagination.showing')} <span className="font-bold text-[#0066CC]">{indexOfFirstItem + 1}</span> {t('pagination.to')} <span className="font-bold text-[#0066CC]">{Math.min(indexOfLastItem, filteredData.length)}</span> {t('pagination.from')} <span className="font-bold text-gray-800">{filteredData.length}</span> {t('pagination.items')}</div>
                        <div className="flex gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-gray-50 transition-colors">{t('pagination.prev')}</button>
                            <div className="px-4 py-2 text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {totalPages}</div>
                            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm disabled:opacity-50 font-bold text-sm hover:bg-gray-50 transition-colors">{t('pagination.next')}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}