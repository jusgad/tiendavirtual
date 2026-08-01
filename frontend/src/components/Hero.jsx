import BenefitsPanel from './BenefitsPanel'
import ProductStage from './ProductStage'
import FloatingCta from './FloatingCta'

// Three-column hero: benefits · product · CTA.
export default function Hero({ isDay, products }) {
  return (
    <main
      className="hero-grid"
      style={{
        position: 'relative',
        zIndex: 20,
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '118px 30px 150px',
        display: 'grid',
        gridTemplateColumns: '1fr 1.15fr 1fr',
        gap: '22px',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <BenefitsPanel isDay={isDay} />
      <ProductStage isDay={isDay} products={products} />
      <FloatingCta isDay={isDay} />
    </main>
  )
}
