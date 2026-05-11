import { useEffect, useState, useMemo } from "react";
import { useAdminStore, type Cliente } from "./store/useAdminStore";
import { supabase } from "../../lib/supabase";
import {
    Building2, Mail, Calendar, ShieldAlert, Plus, Edit2, Trash2, X, ShieldCheck,
    Search, ArrowUpDown, LogOut, ChevronLeft, ChevronRight, AlertTriangle, Eye, EyeOff, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import hostelegal from "../../assets/hostelegal.png";

type SortKey = 'nombre_restaurante' | 'email' | 'fecha_caducidad_suscripcion';

export function AdminDashboard() {
    const { clientes, isLoading, fetchClientes, darDeBaja, crearCliente, actualizarCliente } = useAdminStore();
    const navigate = useNavigate();

    // Estados de UI
    const [tab, setTab] = useState<'activos' | 'inactivos'>('activos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

    // Estados de la Tabla (Búsqueda, Ordenación y Paginación)
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Estados de Formulario
    const [formData, setFormData] = useState({ nombre: '', email: '', password: '', fecha: '', documentos: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        fetchClientes();
    }, []);

    // ─── LÓGICA DE PROCESAMIENTO DE LA TABLA ───
    const clientesProcesados = useMemo(() => {
        const hoy = new Date();

        // 1. Filtrar por Tab
        let filtrados = clientes.filter(c => {
            const caducidad = new Date(c.fecha_caducidad_suscripcion);
            return tab === 'activos' ? caducidad >= hoy : caducidad < hoy;
        });

        // 2. Filtrar por Búsqueda
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtrados = filtrados.filter(c =>
                c.nombre_restaurante.toLowerCase().includes(lowerSearch) ||
                (c.email && c.email.toLowerCase().includes(lowerSearch))
            );
        }

        // 3. Ordenar
        if (sortConfig) {
            filtrados.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtrados;
    }, [clientes, tab, searchTerm, sortConfig]);

    // 4. Paginación
    const totalPages = Math.ceil(clientesProcesados.length / itemsPerPage) || 1;
    const paginatedClientes = clientesProcesados.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reiniciar página si cambian los filtros
    useEffect(() => setCurrentPage(1), [searchTerm, tab, itemsPerPage]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    // ─── LÓGICA DE MODALES ───
    const abrirModalCrear = () => {
        setClienteEditando(null);
        setFormData({
            nombre: '',
            email: '',
            password: '',
            fecha: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
            documentos: 0 // Al crear empieza en 0
        });
        setConfirmPassword("");
        setIsModalOpen(true);
    };

    const abrirModalEditar = (cliente: any) => {
        setClienteEditando(cliente);
        setFormData({
            nombre: cliente.nombre_restaurante,
            email: cliente.email || '',
            password: '',
            fecha: cliente.fecha_caducidad_suscripcion ? cliente.fecha_caducidad_suscripcion.split('T')[0] : '',
            documentos: cliente.documentos_generados || 0 // Cargamos el valor real
        });
        setConfirmPassword("");
        setIsModalOpen(true);
    };

    const handleBaja = async (id: string, nombre: string) => {
        if (window.confirm(`¿Seguro que quieres dar de baja a ${nombre}? Pasará a la lista de inactivos.`)) {
            await darDeBaja(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Nueva validación: Si estás creando, o si estás editando y has escrito una clave nueva
        if ((!clienteEditando || formData.password.length > 0) && formData.password !== confirmPassword) {
            alert("Las contraseñas no coinciden. Por favor, revísalas.");
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        try {
            if (clienteEditando) {
                await actualizarCliente(
                    clienteEditando.id,
                    formData.nombre,
                    formData.email,
                    new Date(formData.fecha).toISOString(),
                    formData.documentos, // <-- Enviamos el contador
                    formData.password || undefined
                );
            } else {
                await crearCliente(formData.nombre, formData.email, formData.password, formData.fecha);
            }
            setIsModalOpen(false);
        } catch (error) {
            alert("Error al guardar: " + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <div className="min-h-screen bg-surface-50 flex flex-col">
            {/* ─── HEADER IGUAL AL DASHBOARD PRINCIPAL ─── */}
            <nav className="bg-white border-b border-surface-200 px-4 sm:px-6 h-16 flex-none z-20 shadow-sm flex items-center justify-between sticky top-0">
                <img src={hostelegal} alt="Hostelegal App" className="h-8 w-auto" />

                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="text-surface-500 hover:text-danger-600 p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            {/* ─── MAIN CONTENT ─── */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 space-y-8">

                {/* Título Principal (Igual que en el Dashboard) */}
                <div>
                    <h2 className="text-3xl font-extrabold text-surface-800 mb-2">
                        Administración de usuarios
                    </h2>
                    <p className="text-surface-500 mt-1">Gestiona las cuentas y suscripciones de la plataforma.</p>
                </div>

                {/* Controles de la Tabla */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-surface-200 shadow-sm">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-full lg:w-auto">
                        <button onClick={() => setTab('activos')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'activos' ? 'bg-white text-brand-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                            Activos
                        </button>
                        <button onClick={() => setTab('inactivos')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'inactivos' ? 'bg-white text-danger-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                            Inactivos
                        </button>
                    </div>

                    {/* Buscador y Nuevo Cliente alineados */}
                    <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search size={16} className="absolute left-3 top-3 text-surface-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                        <button onClick={abrirModalCrear} className="flex items-center justify-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-bold shadow-sm whitespace-nowrap">
                            <Plus size={18} /> Nuevo Cliente
                        </button>
                    </div>
                </div>

                {/* DATA TABLE */}
                <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 select-none">
                                <tr>
                                    <th onClick={() => handleSort('nombre_restaurante')} className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-100 transition-colors group">
                                        <div className="flex items-center gap-2">Restaurante <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                    <th onClick={() => handleSort('email')} className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-100 transition-colors group">
                                        <div className="flex items-center gap-2">Email <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                    <th onClick={() => handleSort('fecha_caducidad_suscripcion')} className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-100 transition-colors group">
                                        <div className="flex items-center gap-2">Caducidad <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-surface-400">Cargando datos...</td></tr>
                                ) : paginatedClientes.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-surface-400">No se encontraron resultados.</td></tr>
                                ) : (
                                    paginatedClientes.map(c => (
                                        <tr key={c.id} className="hover:bg-brand-50/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-surface-800 flex items-center gap-2">
                                                {c.es_admin && <span title="Administrador"><ShieldCheck size={16} className="text-brand-500" /></span>}
                                                {c.nombre_restaurante}
                                            </td>
                                            <td className="px-6 py-4 text-surface-600">{c.email || '—'}</td>
                                            <td className="px-6 py-4 text-surface-600">
                                                {new Date(c.fecha_caducidad_suscripcion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                {tab === 'activos' ? (
                                                    <span className="bg-success-100 text-success-700 px-2.5 py-1 rounded-md text-xs font-bold">Activo</span>
                                                ) : (
                                                    <span className="bg-danger-100 text-danger-700 px-2.5 py-1 rounded-md text-xs font-bold">Baja</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => abrirModalEditar(c)} className="p-2 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                                    <Edit2 size={16} />
                                                </button>
                                                {tab === 'activos' && !c.es_admin && (
                                                    <button onClick={() => handleBaja(c.id, c.nombre_restaurante)} className="p-2 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors" title="Dar de baja">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Controles de Paginación */}
                    {!isLoading && clientesProcesados.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 bg-surface-50">
                            <div className="flex items-center gap-2 text-sm text-surface-500">
                                <span>Mostrar:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="border border-surface-300 rounded-md py-1 px-2 text-surface-700 bg-white outline-none"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-surface-500">
                                    Página <span className="text-surface-500">{currentPage}</span> de {totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-md border border-surface-300 text-surface-600 hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    ><ChevronLeft size={16} /></button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-md border border-surface-300 text-surface-600 hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    ><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ─── MODALES ─── */}

            {/* Modal Cerrar Sesión (Copiado del Dashboard) */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col slide-in-from-bottom-4">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-danger-50 text-danger-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-surface-800 mb-2">¿Cerrar sesión?</h3>
                            <p className="text-surface-500 text-sm">
                                Tendrás que volver a introducir tus credenciales para acceder a tu panel.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 bg-surface-100 hover:bg-surface-200 text-surface-700 font-medium py-2.5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 bg-danger-600 hover:bg-danger-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                            >
                                Sí, cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formulario (Crear/Editar) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col slide-in-from-bottom-4">
                        <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
                            <h3 className="font-bold text-lg text-surface-800">
                                {clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-800 transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-surface-500 mb-1">Nombre Comercial</label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-3 top-3 text-surface-400" />
                                    <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full pl-9 pr-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-surface-500 mb-1">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-3 text-surface-400" />
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                                </div>
                            </div>

                            {/* ─── CONTRASEÑA INICIAL / NUEVA ─── */}
                            <div>
                                <label className="block text-xs font-semibold text-surface-500 mb-1">
                                    {clienteEditando ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}
                                </label>
                                <div className="relative">
                                    <ShieldAlert size={16} className="absolute left-3 top-3 text-surface-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!clienteEditando}
                                        minLength={8}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={clienteEditando ? "Dejar en blanco para no cambiarla" : "Mín. 8 caracteres..."}
                                        className="w-full pl-9 pr-10 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-surface-400 hover:text-brand-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* ─── CONFIRMAR CONTRASEÑA (Aparece al crear o al teclear nueva clave) ─── */}
                            {(!clienteEditando || formData.password.length > 0) && (
                                <div>
                                    <label className="block text-xs font-semibold text-surface-500 mb-1">
                                        Confirmar {clienteEditando ? 'Nueva ' : ''}Contraseña
                                    </label>
                                    <div className="relative">
                                        <ShieldAlert size={16} className="absolute left-3 top-3 text-surface-400" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required={!clienteEditando || formData.password.length > 0}
                                            minLength={8}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Repite la contraseña..."
                                            className="w-full pl-9 pr-10 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3 text-surface-400 hover:text-brand-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-surface-500 mb-1">Fecha de Caducidad</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-3 text-surface-400" />
                                    <input type="date" required value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} className="w-full pl-9 pr-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                                </div>
                            </div>

                            {/* ─── CONTADOR DE DOCUMENTOS (Solo en edición) ─── */}
                            {clienteEditando && (
                                <div className="bg-surface-50 p-4 rounded-2xl border border-surface-200">
                                    <label className="block text-xs font-bold text-surface-500 mb-2 uppercase tracking-wider">
                                        Consumo de documentos (Mes actual)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <FileText size={16} className="absolute left-3 top-3 text-surface-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                max="5"
                                                value={formData.documentos}
                                                onChange={e => setFormData({ ...formData, documentos: parseInt(e.target.value) || 0 })}
                                                className="w-full pl-9 pr-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, documentos: 0 })}
                                            className="px-4 py-2.5 bg-white text-brand-600 border border-brand-200 rounded-xl text-xs font-bold hover:bg-brand-50 transition-colors shadow-sm"
                                        >
                                            Resetear Mes
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-surface-400 mt-2 italic">
                                        * Límite actual: 5 documentos. Al resetear, el cliente podrá volver a usar el generador.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-xl font-medium transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl font-bold transition-colors flex items-center justify-center">
                                    {isSubmitting ? <span className="animate-pulse">Guardando...</span> : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}