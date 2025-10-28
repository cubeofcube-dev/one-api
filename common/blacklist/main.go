package blacklist

import (
	"fmt"
	"sync"
)

var blackList sync.Map

func init() {
	blackList = sync.Map{}
}

func userId2Key(id int) string {
	return fmt.Sprintf("userid_%d", id)
}

// BanUser records the user ID in the in-memory blacklist to block further access.
func BanUser(id int) {
	blackList.Store(userId2Key(id), true)
}

// UnbanUser removes the user ID from the in-memory blacklist.
func UnbanUser(id int) {
	blackList.Delete(userId2Key(id))
}

// IsUserBanned reports whether the given user ID exists in the in-memory blacklist.
func IsUserBanned(id int) bool {
	_, ok := blackList.Load(userId2Key(id))
	return ok
}
