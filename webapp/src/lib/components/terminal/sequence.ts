/**
 * Contexto de secuencia para Terminal (equivalente SequenceContext de React).
 */
export type SequenceContextValue = {
	/** Reserva el siguiente índice de línea (orden de montaje). */
	register: () => number;
	completeItem: (index: number) => void;
	activeIndex: number;
	sequenceStarted: boolean;
	/** true si Terminal tiene sequence activo */
	enabled: boolean;
};

export const SEQUENCE_KEY = 'terminal-sequence';
