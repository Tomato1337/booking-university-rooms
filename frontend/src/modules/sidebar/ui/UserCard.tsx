import { reatomComponent, useWrap } from '@reatom/react'
import { IconDoorExit } from '@tabler/icons-react'

import { currentUserAtom, logoutAction } from '@/modules/auth'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'

const UserCard = reatomComponent(() => {
    const user = currentUserAtom()

    const initials = user
        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
        : '??'
    const fullName = user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    const email = user?.email ?? ''

    return (
        <div
            data-slot="user-card"
            className="flex items-center gap-4 w-full px-1.5"
        >
            <Avatar>
                <AvatarFallback>
                    <span className="text-sm font-medium">{initials}</span>
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-4 justify-between">
                <div className="w-full flex-1">
                    <div className="text-sm font-medium">{fullName}</div>
                    <div className="text-xs text-muted-foreground">{email}</div>
                </div>
                <button
                    type="button"
                    onClick={useWrap(() => logoutAction())}
                    className="cursor-pointer"
                >
                    <IconDoorExit className="size-5 text-muted-foreground transition-colors duration-150 ease-linear hover:text-on-surface" />
                </button>
            </div>
        </div>
    )
}, 'UserCard')

export default UserCard
