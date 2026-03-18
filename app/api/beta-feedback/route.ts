import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  category: z.enum(["bug", "suggestion", "general"]),
  message: z.string().min(1).max(2000),
  page: z.string().max(100).optional(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from("beta_feedback").insert({
    category: parsed.data.category,
    message: parsed.data.message,
    page: parsed.data.page ?? null,
    user_id: user?.id ?? null,
  })

  if (error) {
    console.error("[beta-feedback]", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
