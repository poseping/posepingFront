import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faPen,
  faRandom,
  faRightFromBracket,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { UserInfo } from '../../services/authService'

interface MyProfileCardProps {
  user: UserInfo | null
  editingNickname: boolean
  nicknameInput: string
  providerLabel: string
  provider?: string
  isRandomNicknamePending: boolean
  isNicknamePending: boolean
  isNicknameError: boolean
  isDeletePending: boolean
  onNicknameInputChange: (value: string) => void
  onEditNickname: () => void
  onRandomNickname: () => void
  onSaveNickname: () => void
  onCancelNickname: () => void
  onLogout: () => void
  onDeleteAccount: () => void
}

export default function MyProfileCard({
  user,
  editingNickname,
  nicknameInput,
  providerLabel,
  provider,
  isRandomNicknamePending,
  isNicknamePending,
  isNicknameError,
  isDeletePending,
  onNicknameInputChange,
  onEditNickname,
  onRandomNickname,
  onSaveNickname,
  onCancelNickname,
  onLogout,
  onDeleteAccount,
}: MyProfileCardProps) {
  return (
    <section className="card mp-profile-card">
      <div className="mp-card-header">
        <p className="mp-kicker">My Profile</p>
      </div>

      <div className="mp-profile-body">
        <div className="mp-avatar">
          {user?.profile_image_url ? (
            <img src={user.profile_image_url} alt="프로필" className="mp-avatar-img" />
          ) : (
            <FontAwesomeIcon icon={faUser} className="mp-avatar-icon" />
          )}
        </div>

        <div className="mp-profile-info">
          {editingNickname ? (
            <div className="mp-nickname-edit">
              <input
                className="mp-nickname-input"
                value={nicknameInput}
                onChange={e => onNicknameInputChange(e.target.value)}
                maxLength={20}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveNickname()
                  if (e.key === 'Escape') onCancelNickname()
                }}
              />
              <button className="btn-icon" onClick={onRandomNickname} disabled={isRandomNicknamePending}>
                <FontAwesomeIcon icon={faRandom} />
              </button>
              <button className="btn-icon" onClick={onSaveNickname} disabled={isNicknamePending}>
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button className="btn-icon" onClick={onCancelNickname}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ) : (
            <div className="mp-nickname-row">
              <h2 className="mp-nickname">{user?.nickname ?? '사용자'}</h2>
              <button className="btn-icon" onClick={onEditNickname} aria-label="닉네임 수정">
                <FontAwesomeIcon icon={faPen} />
              </button>
            </div>
          )}

          <span className={`mp-provider-badge${provider ? ` mp-provider-badge--${provider.toLowerCase()}` : ''}`}>
            {provider && <img src={`/assets/img/${provider.toLowerCase()}_logo.svg`} alt="" width={14} height={14} />}
            {providerLabel}
          </span>

          {isNicknameError && <p className="mp-error">닉네임 변경에 실패했습니다.</p>}
        </div>
      </div>

    
      <div className="mp-account-actions">
        <button className="mp-account-action" type="button" onClick={onLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>로그아웃</span>
        </button>
        <button
          className="mp-account-action mp-account-action--danger"
          type="button"
          onClick={onDeleteAccount}
          disabled={isDeletePending}
        >
          {isDeletePending ? '탈퇴 중...' : '회원탈퇴'}
        </button>
      </div>
    </section>
  )
}
