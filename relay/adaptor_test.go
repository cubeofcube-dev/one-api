package relay

import (
	"testing"

	"github.com/cubeofcube-dev/one-api/relay/apitype"
	. "github.com/smartystreets/goconvey/convey"
)

func TestGetAdaptor(t *testing.T) {
	Convey("get adaptor", t, func() {
		for i := 0; i < apitype.Dummy; i++ {
			a := GetAdaptor(i)
			So(a, ShouldNotBeNil)
		}
	})
}
