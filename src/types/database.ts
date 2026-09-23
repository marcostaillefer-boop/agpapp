export type Rol = 'super_admin' | 'empleado' | 'propietario';

export type Modulo = 'comunidades' | 'incidencias' | 'cuotas' | 'documentos' | 'juntas' | 'mantenimiento';
export type NivelPermiso = 'ninguno' | 'ver' | 'editar';
export type Permisos = Partial<Record<Modulo, NivelPermiso>>;

export type EstadoIncidencia = 'abierta' | 'en_proceso' | 'cerrada';
export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida';
export type TipoDocumento = 'acta' | 'convocatoria' | 'presupuesto' | 'factura' | 'otro';
export type TipoJunta = 'ordinaria' | 'extraordinaria';
export type ModalidadJunta = 'presencial' | 'online' | 'mixta';
export type EstadoJunta = 'convocada' | 'en_curso' | 'finalizada';
export type EstadoPunto = 'pendiente' | 'en_votacion' | 'cerrado';
export type ModalidadAsistencia = 'presencial' | 'online';
export type OpcionVoto = 'a_favor' | 'en_contra' | 'abstencion';
export type CargoDirectivo = 'presidente' | 'vicepresidente' | 'secretario' | 'vocal';
export type TipoEjecutor = 'personal' | 'externa';
export type FrecuenciaTarea = 'puntual' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type EstadoRegistroTarea = 'pendiente' | 'completada';
export type SentidoInstruccion = 'a_favor' | 'en_contra' | 'abstencion' | 'libre';
export type TipoFichaje = 'entrada' | 'salida';
export type TipoAusencia = 'vacaciones' | 'dia_libre' | 'baja' | 'otro';

export type ResultadoPunto = {
  votos_emitidos: number;
  coeficiente_a_favor: number;
  coeficiente_en_contra: number;
  coeficiente_abstencion: number;
  coeficiente_total: number;
  aprobado: boolean;
};

export type Profile = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  rol: Rol;
  created_at: string;
};

export type Administracion = {
  id: string;
  nombre: string;
  propietario_id: string;
  enlace_documentos_base: string | null;
  created_at: string;
};

export type Empleado = {
  id: string;
  administracion_id: string;
  profile_id: string;
  permisos: Permisos;
  activo: boolean;
  comunidad_id: string | null;
  created_at: string;
};

export type Comunidad = {
  id: string;
  nombre: string;
  direccion: string;
  cif: string | null;
  administracion_id: string;
  created_at: string;
};

export type Vivienda = {
  id: string;
  comunidad_id: string;
  propietario_id: string | null;
  identificador: string;
  bloque: string | null;
  coeficiente: number;
  derecho_voto: boolean;
  cargo: CargoDirectivo | null;
  nombre_propietario: string | null;
  telefono: string | null;
  email: string | null;
  direccion_notificacion: string | null;
  created_at: string;
};

export type Incidencia = {
  id: string;
  comunidad_id: string;
  vivienda_id: string | null;
  creado_por: string;
  titulo: string;
  descripcion: string;
  estado: EstadoIncidencia;
  foto_url: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacion_texto: string | null;
  created_at: string;
  updated_at: string;
};

export type Proveedor = {
  id: string;
  administracion_id: string;
  categoria: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  creado_por: string;
  created_at: string;
};

export type Cuota = {
  id: string;
  comunidad_id: string;
  vivienda_id: string;
  periodo: string;
  concepto: string;
  importe: number;
  estado: EstadoCuota;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  created_at: string;
};

export type Documento = {
  id: string;
  comunidad_id: string;
  junta_id: string | null;
  nombre: string;
  tipo: TipoDocumento;
  url: string;
  subido_por: string;
  created_at: string;
};

export type Junta = {
  id: string;
  comunidad_id: string;
  titulo: string;
  tipo: TipoJunta;
  modalidad: ModalidadJunta;
  fecha: string;
  hora: string;
  lugar: string | null;
  enlace_online: string | null;
  estado: EstadoJunta;
  creado_por: string;
  created_at: string;
};

export type PuntoOrdenDia = {
  id: string;
  junta_id: string;
  orden: number;
  titulo: string;
  descripcion: string | null;
  requiere_votacion: boolean;
  estado: EstadoPunto;
  resultado: ResultadoPunto | null;
  created_at: string;
};

export type Asistente = {
  id: string;
  junta_id: string;
  vivienda_id: string;
  propietario_id: string;
  modalidad: ModalidadAsistencia;
  representada: boolean;
  representante_nombre: string | null;
  instrucciones_voto: Partial<Record<string, SentidoInstruccion>> | null;
  hora_registro: string;
};

export type Voto = {
  id: string;
  punto_id: string;
  vivienda_id: string;
  registrado_por: string;
  opcion: OpcionVoto;
  created_at: string;
};

export type TipoDestinatarios = 'todos' | 'bloque' | 'seleccion';

export type Circular = {
  id: string;
  comunidad_id: string;
  titulo: string;
  mensaje: string;
  destinatarios: TipoDestinatarios;
  bloque: string | null;
  creado_por: string;
  created_at: string;
};

export type CircularDestinatario = {
  id: string;
  circular_id: string;
  vivienda_id: string;
};

export type TareaMantenimiento = {
  id: string;
  comunidad_id: string;
  titulo: string;
  categoria: string;
  descripcion: string | null;
  tipo_ejecutor: TipoEjecutor;
  asignado_a: string | null;
  proveedor_id: string | null;
  frecuencia: FrecuenciaTarea;
  activa: boolean;
  creado_por: string;
  created_at: string;
};

export type RegistroTarea = {
  id: string;
  tarea_id: string;
  fecha_prevista: string;
  estado: EstadoRegistroTarea;
  fecha_completada: string | null;
  completado_por: string | null;
  notas: string | null;
  created_at: string;
};

export type CodigoAcceso = {
  id: string;
  codigo: string;
  vivienda_id: string | null;
  administracion_id: string | null;
  comunidad_empleado_id: string | null;
  permisos: Permisos | null;
  usado: boolean;
  usado_por: string | null;
  creado_por: string;
  expira_en: string | null;
  created_at: string;
};

export type Fichaje = {
  id: string;
  profile_id: string;
  tipo: TipoFichaje;
  hora: string;
  created_at: string;
};

export type SolicitudAusencia = {
  id: string;
  profile_id: string;
  tipo: TipoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  aprobado_admin: boolean;
  aprobado_admin_por: string | null;
  aprobado_admin_en: string | null;
  aprobado_presidente: boolean;
  aprobado_presidente_por: string | null;
  aprobado_presidente_en: string | null;
  rechazada: boolean;
  rechazada_por: string | null;
  motivo_rechazo: string | null;
  created_at: string;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      administraciones: TableDef<Administracion>;
      empleados: TableDef<Empleado>;
      comunidades: TableDef<Comunidad>;
      viviendas: TableDef<Vivienda>;
      incidencias: TableDef<Incidencia>;
      cuotas: TableDef<Cuota>;
      documentos: TableDef<Documento>;
      juntas: TableDef<Junta>;
      puntos_orden_dia: TableDef<PuntoOrdenDia>;
      asistentes: TableDef<Asistente>;
      votos: TableDef<Voto>;
      codigos_acceso: TableDef<CodigoAcceso>;
      proveedores: TableDef<Proveedor>;
      circulares: TableDef<Circular>;
      circulares_destinatarios: TableDef<CircularDestinatario>;
      tareas_mantenimiento: TableDef<TareaMantenimiento>;
      tareas_mantenimiento_registros: TableDef<RegistroTarea>;
      fichajes: TableDef<Fichaje>;
      solicitudes_ausencia: TableDef<SolicitudAusencia>;
    };
    Views: Record<string, never>;
    Functions: {
      abrir_votacion: { Args: { punto: string }; Returns: undefined };
      cerrar_votacion: { Args: { punto: string }; Returns: undefined };
      redimir_codigo_acceso: { Args: { codigo_input: string }; Returns: undefined };
      responder_solicitud_ausencia: { Args: { solicitud: string; aprobar: boolean; motivo: string | null }; Returns: undefined };
    };
  };
};
