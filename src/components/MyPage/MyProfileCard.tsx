import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faGear, faPen, faRandom, faUser, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { UserInfo } from '../../services/authService'

interface MyProfileCardProps {
  user: UserInfo | null
  editingNickname: boolean
  nicknameInput: string
  providerLabel: string
  isRandomNicknamePending: boolean
  isNicknamePending: boolean
  isNicknameError: boolean
  onNicknameInputChange: (value: string) => void
  onEditNickname: () => void
  onRandomNickname: () => void
  onSaveNickname: () => void
  onCancelNickname: () => void
  onOpenSettings: () => void
}

export default function MyProfileCard({
  user,
  editingNickname,
  nicknameInput,
  providerLabel,
  isRandomNicknamePending,
  isNicknamePending,
  isNicknameError,
  onNicknameInputChange,
  onEditNickname,
  onRandomNickname,
  onSaveNickname,
  onCancelNickname,
  onOpenSettings,
}: MyProfileCardProps) {
  return (
<section className="card mp-profile-card">
          <div className="mp-card-header">
            <p className="mp-kicker">My Profile</p>
            <button className="btn-icon mp-settings-button" type="button" onClick={onOpenSettings} aria-label="설정">
              <FontAwesomeIcon icon={faGear} />
            </button>
          </div>
          <div className="mp-profile-body">
            <div className="mp-avatar">
              {user?.profile_image_url
                ? <img src={user.profile_image_url} alt="프로필" className="mp-avatar-img" />
                : <FontAwesomeIcon icon={faUser} className="mp-avatar-icon" />
              }
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
                  <button
                    className="btn-icon"
                    onClick={onRandomNickname}
                    disabled={isRandomNicknamePending}
                  >
                    <FontAwesomeIcon icon={faRandom} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={onSaveNickname}
                    disabled={isNicknamePending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button className="btn-icon" onClick={onCancelNickname}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div className="mp-nickname-row">
                  <h2 className="mp-nickname">{user?.nickname ?? '사용자'}</h2>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      onEditNickname()
                    }}
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                </div>
              )}
              <span className="mp-provider-badge">{providerLabel}</span>
              {isNicknameError && (
                <p className="mp-error">닉네임 변경에 실패했습니다.</p>
              )}
            </div>
          </div>

        </section>
  )
}
