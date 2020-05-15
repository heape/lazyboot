#ifndef URL_HH_
#define URL_HH_
#include <string>
#include <algorithm> // find

struct URL
{
  public:
    std::string QueryString, Path, Protocol, Host, Port;

    static URL Parse(const std::string &url)
    {
        URL result;

        typedef std::string::const_iterator iterator_t;

        if (url.length() == 0)
            return result;

        iterator_t URLEnd = url.end();

        // get query start
        iterator_t queryStart = std::find(url.begin(), URLEnd, L'?');

        // protocol
        iterator_t protocolStart = url.begin();
        iterator_t protocolEnd = std::find(protocolStart, URLEnd, L':'); //"://");

        if (protocolEnd != URLEnd)
        {
            std::string prot = &*(protocolEnd);
            if ((prot.length() > 3) && (prot.substr(0, 3) == "://"))
            {
                result.Protocol = std::string(protocolStart, protocolEnd);
                protocolEnd += 3; //      ://
            }
            else
                protocolEnd = url.begin(); // no protocol
        }
        else
            protocolEnd = url.begin(); // no protocol

        // host
        iterator_t hostStart = protocolEnd;
        iterator_t pathStart = std::find(hostStart, URLEnd, L'/'); // get pathStart

        iterator_t hostEnd = std::find(protocolEnd,
                                       (pathStart != URLEnd) ? pathStart : queryStart,
                                       L':'); // check for port

        result.Host = std::string(hostStart, hostEnd);

        // port
        if ((hostEnd != URLEnd) && ((&*(hostEnd))[0] == L':')) // we have a port
        {
            hostEnd++;
            iterator_t portEnd = (pathStart != URLEnd) ? pathStart : queryStart;
            result.Port = std::string(hostEnd, portEnd);
        }

        // path
        if (pathStart != URLEnd)
            result.Path = std::string(pathStart, queryStart);

        // query
        if (queryStart != URLEnd)
            result.QueryString = std::string(queryStart, url.end());

        return result;

    } // Parse
};    // URL
#endif /* URL_HH_ */ #pragma once
