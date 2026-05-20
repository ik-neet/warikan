export default function SiteBrand({ className = '' }) {
  return (
    <a
      className={`site-brand ${className}`.trim()}
      href="https://ik-neet.com/"
      target="_blank"
      rel="noreferrer"
      aria-label="ik-neet.com を開く"
    >
      <span className="site-brand-mark" aria-hidden="true">ik</span>
      <span className="site-brand-text">ik-neet.com</span>
    </a>
  )
}
