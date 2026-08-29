import { ErrorBanner, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Modal } from '../components/ui.jsx'

/** `devuelveStock` lo decide el backend según el estado; aquí solo se anuncia. */
export default function CancelDialog({ devuelveStock, onConfirmar, onCerrar, enviando, error }) {
  return (
    <Modal titulo="Cancelar pedido" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-[#6A5A4A]">
          Esta acción no se puede deshacer: un pedido cancelado no vuelve a ningún otro estado.
        </p>
        <p className="text-sm font-semibold text-[#3A2A1A]">
          {devuelveStock
            ? 'Las unidades del pedido volverán al inventario.'
            : 'El pedido ya fue despachado: las unidades NO vuelven al inventario.'}
        </p>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3">
          <SecondaryButton type="button" onClick={onCerrar} disabled={enviando}>
            Volver
          </SecondaryButton>
          <PrimaryButton type="button" onClick={onConfirmar} disabled={enviando}>
            {enviando ? 'Cancelando…' : 'Sí, cancelar pedido'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
