export default function SiteBrand({ className = '' }) {
  return (
    <a
      className={`site-brand ${className}`.trim()}
      href="https://ik-neet.com/"
      target="_blank"
      rel="noreferrer"
      aria-label="ik-neet.com を開く"
    >
      <img className="site-brand-logo" src="/ik-neet-logo.svg" alt="ik-neet.com" />
    </a>
  )
}
