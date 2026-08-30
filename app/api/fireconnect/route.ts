import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://firewallitsolution.com/fireconnect/api/api.php';
const CLIENT_KEY = process.env.NEXT_PUBLIC_FIRECONNECT_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.NEXT_PUBLIC_FIRECONNECT_CLIENT_SECRET || '';

export async function POST(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const apicall = searchParams.get('apicall');

        if (!apicall) {
            return NextResponse.json({ error: 'Missing apicall parameter' }, { status: 400 });
        }

        const contentType = req.headers.get('content-type') || '';

        // Log for debugging
        console.log(`Proxying ${apicall} request...`);

        let response;

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            // Create a new FormData instance to send upstream
            const upstreamFormData = new FormData();

            formData.forEach((value, key) => {
                upstreamFormData.append(key, value);
            });

            response = await fetch(`${API_BASE_URL}?apicall=${apicall}`, {
                method: 'POST',
                headers: {
                    'X-Client-Key': CLIENT_KEY,
                    'X-Client-Secret': CLIENT_SECRET,
                    // Content-Type is collected automatically with boundary
                },
                body: upstreamFormData,
            });

        } else {
            // Handle x-www-form-urlencoded
            const bodyText = await req.text();

            response = await fetch(`${API_BASE_URL}?apicall=${apicall}`, {
                method: 'POST',
                headers: {
                    'X-Client-Key': CLIENT_KEY,
                    'X-Client-Secret': CLIENT_SECRET,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: bodyText
            });
        }

        // Try to parse JSON response
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse upstream response:', responseText);
            // If not JSON, return text or error
            return NextResponse.json({
                status: false,
                message: 'Invalid response from upstream provider',
                raw: responseText
            }, { status: 502 });
        }

        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({
            status: false,
            message: error.message || 'Internal Server Error',
            error: String(error)
        }, { status: 500 });
    }
}
