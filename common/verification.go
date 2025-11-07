package common

import (
	"strings"
	"sync"
	"time"

	gutils "github.com/Laisky/go-utils/v6"
)

type verificationValue struct {
	code string
	time time.Time
}

const (
	// EmailVerificationPurpose tags verification codes created for email binding flows.
	EmailVerificationPurpose = "v"
	// PasswordResetPurpose tags verification codes created for password reset workflows.
	PasswordResetPurpose = "r"
)

var verificationMutex sync.Mutex
var verificationMap map[string]verificationValue
var verificationMapMaxSize = 10

// VerificationValidMinutes specifies how long verification codes remain valid before expiring.
var VerificationValidMinutes = 10

// GenerateVerificationCode generates a verification code of the specified length.
// If length <= 0, it generates a full UUID (32 characters without hyphens).
// For other lengths, it generates a random alphanumeric string of the given length.
func GenerateVerificationCode(length int) string {
	if length <= 0 {
		return strings.ReplaceAll(gutils.UUID7(), "-", "")
	}

	return gutils.RandomStringWithLength(length)
}

// RegisterVerificationCodeWithKey stores the verification code for the given key and purpose, replacing older entries.
func RegisterVerificationCodeWithKey(key string, code string, purpose string) {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	verificationMap[purpose+key] = verificationValue{
		code: code,
		time: time.Now(),
	}
	if len(verificationMap) > verificationMapMaxSize {
		removeExpiredPairs()
	}
}

// VerifyCodeWithKey checks whether the submitted code matches the stored value for the key and purpose.
// It returns false when the code is missing or has expired.
func VerifyCodeWithKey(key string, code string, purpose string) bool {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	value, okay := verificationMap[purpose+key]
	now := time.Now()
	if !okay || int(now.Sub(value.time).Seconds()) >= VerificationValidMinutes*60 {
		return false
	}
	return code == value.code
}

// DeleteKey removes any stored code for the provided key and purpose combination.
func DeleteKey(key string, purpose string) {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	delete(verificationMap, purpose+key)
}

// no lock inside, so the caller must lock the verificationMap before calling!
func removeExpiredPairs() {
	now := time.Now()
	for key := range verificationMap {
		if int(now.Sub(verificationMap[key].time).Seconds()) >= VerificationValidMinutes*60 {
			delete(verificationMap, key)
		}
	}
}

func init() {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	verificationMap = make(map[string]verificationValue)
}
