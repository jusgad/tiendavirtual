import { useState } from 'react'
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Modal } from '../components/ui.jsx'
import { envioCompleto } from './ordersModel.js'

/**
 * Despacho del pedido. Transportadora y guía son obligatorias: un pedido
 * marcado como enviado sin guía deja al cliente sin nada que rastrear.
 */
export default function ShipDialog({ onConfirmar, onCerrar, enviando, error }) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const completo = envioCompleto({ carrier, trackingNumber })

  return (
    <Modal titulo="Marcar como enviado" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-[#6A5A4A]">
          El cliente verá estos datos en el seguimiento de su pedido.
        </p>

        <Field label="Transportadora">
          <Input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="Servientrega"
            maxLength={80}
          />
        </Field>

        <Field label="Número de guía">
          <Input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="ABC123456789"
            maxLength={80}
          />
        </Field>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3">
          <SecondaryButton type="button" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!completo || enviando}
            onClick={() => onConfirmar({ carrier: carrier.trim(), trackingNumber: trackingNumber.trim() })}
          >
            {enviando ? 'Guardando…' : 'Confirmar envío'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
