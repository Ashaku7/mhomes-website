import { SignIn } from '@clerk/nextjs'

export default function AdminLoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F0F2F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px'
    }}>
      <img
        src="/mhomes-logo.png"
        alt="MHomes Resort"
        style={{ height: '56px', width: 'auto' }}
      />
      <p style={{
        fontFamily: 'var(--font-label)',
        fontSize: '11px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#718096'
      }}>
        Admin Access Only
      </p>
      <SignIn
        routing="hash"
        forceRedirectUrl="/admin"
        fallbackRedirectUrl="/admin"
      />
    </div>
  )
}
