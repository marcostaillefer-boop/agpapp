export type Rol = 'admin' | 'propietario';

export type EstadoIncidencia = 'abierta' | 'en_proceso' | 'cerrada';
export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida';
export type TipoDocumento = 'acta' | 'convocatoria' | 'presupuesto' | 'factura' | 'otro';
export type TipoJunta = 'ordinaria' | 'extraordinaria';
export type ModalidadJunta = 'presencial' | 'online' | 'mixta';
export type EstadoJunta = 'convocada' | 'en_curso' | 'finalizada';
export type EstadoPunto = 'pendiente' | 'en_votacion' | 'cerrado';
export type ModalidadAsistencia = 'presencial' | 'online';
export type OpcionVoto = 'a_favor' | 'en_contra' | 'abstencion';

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

export type Comunidad = {
  id: string;
  nombre: string;
  direccion: string;
  cif: string | null;
  administrador_id: string;
  created_at: string;
};

export type Vivienda = {
  id: string;
  comunidad_id: string;
  propietario_id: string | null;
  identificador: string;
  coeficiente: number;
  derecho_voto: boolean;
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
  created_at: string;
  updated_at: string;
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
  hora_registro: string;
};

export type Voto = {
  id: string;
  punto_id: string;
  vivienda_id: string;
  propietario_id: string;
  opcion: OpcionVoto;
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
      comunidades: TableDef<Comunidad>;
      viviendas: TableDef<Vivienda>;
      incidencias: TableDef<Incidencia>;
      cuotas: TableDef<Cuota>;
      documentos: TableDef<Documento>;
      juntas: TableDef<Junta>;
      puntos_orden_dia: TableDef<PuntoOrdenDia>;
      asistentes: TableDef<Asistente>;
      votos: TableDef<Voto>;
    };
    Views: Record<string, never>;
    Functions: {
      abrir_votacion: { Args: { punto: string }; Returns: undefined };
      cerrar_votacion: { Args: { punto: string }; Returns: undefined };
    };
  };
};
