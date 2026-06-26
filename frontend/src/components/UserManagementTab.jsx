import React from 'react';

export default function UserManagementTab({
    t, users, userForm, setUserForm, editingUserId, setEditingUserId, handleUserSubmit, handleUserDelete, currentUser
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6 h-fit">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg text-gray-800">
                    <h3 className="text-xl font-black text-[#0066CC] mb-4">{editingUserId ? t('user.edit_title') : t('user.add_title')}</h3>
                    <form onSubmit={handleUserSubmit} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('user.username')}</label><input type="text" required disabled={!!editingUserId} value={userForm.username || ''} onChange={(e) => setUserForm(prev => ({ ...prev, username: String(e.target.value).toUpperCase() }))} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800 disabled:bg-gray-100" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-1">{editingUserId ? t('user.new_password') : t('user.password')}</label><input type="password" required={!editingUserId} value={userForm.passwordHash || ''} onChange={(e) => setUserForm({ ...userForm, passwordHash: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" /></div>
                        <div><label className="block text-sm font-bold text-gray-600 mb-1">{t('user.fullname')}</label><input type="text" required value={userForm.firstName || ''} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800" /></div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">{t('user.role')}</label>
                            <select value={userForm.role || 'operator'} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg font-bold bg-white outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] text-gray-800">
                                <option value="operator">{t('user.role_operator')}</option>
                                <option value="admin">{t('user.role_admin')}</option>
                            </select>
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <button type="submit" className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors">{t('common.save')}</button>
                            {editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ username: '', passwordHash: '', firstName: '', role: 'operator' }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors">{t('common.cancel')}</button>}
                        </div>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
                <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                            <th className="py-4 px-4 text-left font-bold uppercase tracking-wider text-sm">{t('table.username')}</th>
                            <th className="py-4 px-4 text-left font-bold uppercase tracking-wider text-sm">{t('table.fullname')}</th>
                            <th className="py-4 px-4 text-center font-bold uppercase tracking-wider text-sm">{t('table.role')}</th>
                            <th className="py-4 px-4 text-center font-bold uppercase tracking-wider text-sm">{t('table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users && users.length > 0 ? (
                            users.filter(u => u && u.username).map(u => (
                                <tr key={u?.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 font-mono font-black text-[#0066CC]">{u?.username}</td>
                                    <td className="py-3 px-4 text-gray-800 font-bold text-sm">{u?.firstName}</td>
                                    <td className="py-3 px-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${u?.role?.toLowerCase() === 'admin' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{u?.role}</span></td>
                                    <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                                        <button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, passwordHash: '', firstName: u.firstName, role: u.role?.toLowerCase() }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm bg-blue-50 text-[#0066CC] hover:bg-[#0066CC] hover:text-white border border-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.edit')}</button>
                                        {currentUser.id !== u.id && <button onClick={() => handleUserDelete(u.id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">{t('common.delete')}</button>}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="py-8 text-center text-gray-400 font-bold">{t('table.no_user_data')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}