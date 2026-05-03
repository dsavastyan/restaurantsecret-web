import { Link } from 'react-router-dom'

type PublicAccountLinkProps = {
  className: string
}

export default function PublicAccountLink({ className }: PublicAccountLinkProps) {
  return (
    <Link to="/account" className={className}>
      Личный кабинет
    </Link>
  )
}
