import { NextRequest, NextResponse } from 'next/server';

import { isAppConfigured } from '@/lib/setup/config';

export async function POST(req: NextRequest) {
  // Block this endpoint when app is already configured
  if (isAppConfigured()) {
    return NextResponse.json(
      { error: 'App is already configured' },
      { status: 403 }
    );
  }

  try {
    const { vercelToken, projectId, envVars } = await req.json();

    if (!vercelToken || !projectId || !envVars) {
      return NextResponse.json(
        { error: 'vercelToken, projectId, and envVars are required' },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    };

    // 1. First, get existing env vars to know which to create vs update
    const existingRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env`,
      { headers }
    );

    if (!existingRes.ok) {
      const errData = await existingRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errData.error?.message ||
            `Failed to fetch project. Status: ${existingRes.status}. Check your token and project ID.`,
        },
        { status: 400 }
      );
    }

    const existingData = await existingRes.json();
    const existingKeys = new Map<string, string>();

    if (existingData.envs) {
      for (const env of existingData.envs) {
        existingKeys.set(env.key, env.id);
      }
    }

    // 2. Set each env var (create or update)
    const errors: string[] = [];

    for (const [key, value] of Object.entries(envVars)) {
      const envId = existingKeys.get(key);

      if (envId) {
        // Update existing
        const updateRes = await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${envId}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              value: value as string,
              type: 'encrypted',
              target: ['production', 'preview', 'development'],
            }),
          }
        );

        if (!updateRes.ok) {
          errors.push(`Failed to update ${key}: ${updateRes.status}`);
        }
      } else {
        // Create new
        const createRes = await fetch(
          `https://api.vercel.com/v10/projects/${projectId}/env`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              key,
              value: value as string,
              type: 'encrypted',
              target: ['production', 'preview', 'development'],
            }),
          }
        );

        if (!createRes.ok) {
          errors.push(`Failed to create ${key}: ${createRes.status}`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: `Some env vars failed to set: ${errors.join(', ')}`,
        },
        { status: 500 }
      );
    }

    // 3. Get the latest deployment to determine the git source
    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`,
      { headers }
    );

    let deployUrl = '';

    if (deploymentsRes.ok) {
      const deploymentsData = await deploymentsRes.json();
      const latest = deploymentsData.deployments?.[0];

      if (latest) {
        // Trigger a redeploy of the latest deployment
        const redeployRes = await fetch(
          'https://api.vercel.com/v13/deployments',
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: latest.name,
              deploymentId: latest.uid,
              meta: { action: 'redeploy' },
              target: 'production',
            }),
          }
        );

        if (redeployRes.ok) {
          const redeployData = await redeployRes.json();
          deployUrl = `https://${redeployData.url || redeployData.alias?.[0] || ''}`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: deployUrl,
      message:
        'Environment variables set and redeploy triggered. Your site will be ready in ~60 seconds.',
    });
  } catch (error: any) {
    console.error('Error deploying:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deploy' },
      { status: 500 }
    );
  }
}
