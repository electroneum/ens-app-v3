import { useLocalStorage } from '@app/hooks/useLocalStorage'
import { UserConfig, UserTheme } from '@app/types'

const useUserConfig = () => {
  const [userConfig, setUserConfig] = useLocalStorage<UserConfig>('userConfig', {
    theme: 'light',
  })
  const setTheme = (theme: UserTheme) => setUserConfig((prev) => ({ ...prev, theme }))
  return { userConfig, setTheme }
}

export default useUserConfig