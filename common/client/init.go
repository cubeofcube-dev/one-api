package client

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/Laisky/zap"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/logger"
)

// HTTPClient is the default outbound client used for relay requests.
var HTTPClient *http.Client

// ImpatientHTTPClient is a short-timeout client for quick health checks or metadata requests.
var ImpatientHTTPClient *http.Client

// UserContentRequestHTTPClient fetches user-supplied resources, optionally via a dedicated proxy.
var UserContentRequestHTTPClient *http.Client

// Init builds the shared HTTP clients with proxy and timeout settings derived from configuration.
func Init() {
	// Create a transport with HTTP/2 disabled to avoid stream errors in CI environments
	createTransport := func(proxyURL *url.URL) *http.Transport {
		transport := &http.Transport{
			TLSNextProto: make(map[string]func(authority string, c *tls.Conn) http.RoundTripper), // Disable HTTP/2
		}
		if proxyURL != nil {
			transport.Proxy = http.ProxyURL(proxyURL)
		}
		return transport
	}

	if config.UserContentRequestProxy != "" {
		logger.Logger.Info("using proxy to fetch user content", zap.String("proxy", config.UserContentRequestProxy))
		proxyURL, err := url.Parse(config.UserContentRequestProxy)
		if err != nil {
			logger.Logger.Fatal(fmt.Sprintf("USER_CONTENT_REQUEST_PROXY set but invalid: %s", config.UserContentRequestProxy))
		}
		UserContentRequestHTTPClient = &http.Client{
			Transport: createTransport(proxyURL),
			Timeout:   time.Second * time.Duration(config.UserContentRequestTimeout),
		}
	} else {
		UserContentRequestHTTPClient = &http.Client{
			Transport: createTransport(nil),
			Timeout:   30 * time.Second, // Set a reasonable default timeout
		}
	}
	var transport http.RoundTripper
	if config.RelayProxy != "" {
		logger.Logger.Info("using api relay proxy", zap.String("proxy", config.RelayProxy))
		proxyURL, err := url.Parse(config.RelayProxy)
		if err != nil {
			logger.Logger.Fatal(fmt.Sprintf("RELAY_PROXY set but invalid: %s", config.RelayProxy))
		}
		transport = createTransport(proxyURL)
	} else {
		transport = createTransport(nil)
	}

	if config.RelayTimeout == 0 {
		HTTPClient = &http.Client{
			Transport: transport,
		}
	} else {
		HTTPClient = &http.Client{
			Timeout:   time.Duration(config.RelayTimeout) * time.Second,
			Transport: transport,
		}
	}

	ImpatientHTTPClient = &http.Client{
		Timeout:   5 * time.Second,
		Transport: transport,
	}
}
