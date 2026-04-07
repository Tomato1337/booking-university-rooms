<div className="min-h-svh bg-background">
      {/* Hero */}
      <header className="flex flex-col gap-2 bg-surface-container-low px-6 py-16 md:px-12">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Design System Preview
        </p>
        <h1 className="text-5xl font-black uppercase tracking-tighter text-on-surface md:text-7xl">
          Brutalist
          <br />
          Concierge
        </h1>
        <div className="mt-2 h-1.5 w-20 bg-primary" />
        <p className="mt-4 max-w-md text-sm text-on-surface-variant">
          Dark-only neo-brutalist design system for the university room booking
          platform. Electric violet accent inspired by MTUCI, sharp corners,
          tonal surface layering, no shadows, no borders for sectioning.
        </p>
      </header>
      

      <main className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-16 md:px-12">
        {/* ── Buttons ───────────────────────────────────────────── */}
        <Section title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="default">Default</Button>
            <Button size="lg">LG</Button>
            <Button size="icon">
              <IconDotsVertical className="size-4" />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* ── Badge ─────────────────────────────────────────────── */}
        <Section title="Badge">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="available" dot>Available</Badge>
            <Badge variant="booked" dot>Booked</Badge>
            <Badge variant="pending" dot>Pending</Badge>
            <Badge variant="confirmed" dot>Confirmed</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="ghost">Ghost</Badge>
          </div>
        </Section>

        {/* ── Input ─────────────────────────────────────────────── */}
        <Section title="Input">
          <div className="grid max-w-lg gap-4">
            <Input placeholder="Search rooms..." />
            <Input placeholder="Disabled input" disabled />
          </div>
        </Section>

        {/* ── Select ────────────────────────────────────────────── */}
        <Section title="Select">
          <div className="max-w-xs">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select purpose..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lecture">Academic Lecture</SelectItem>
                <SelectItem value="workshop">Research Workshop</SelectItem>
                <SelectItem value="study">Collaborative Study</SelectItem>
                <SelectItem value="assessment">Technical Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* ── Avatar ────────────────────────────────────────────── */}
        <Section title="Avatar">
          <div className="flex items-center gap-4">
            <Avatar size="sm">
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarImage src="https://i.pravatar.cc/80?u=brutalist" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>LG</AvatarFallback>
            </Avatar>
          </div>
        </Section>

        {/* ── Separator ─────────────────────────────────────────── */}
        <Section title="Separator">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-on-surface-variant">Horizontal tonal gap</p>
            <Separator />
            <p className="text-sm text-on-surface-variant">Content after separator</p>
          </div>
          <div className="flex h-12 items-center gap-2">
            <span className="text-sm text-on-surface-variant">Left</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-on-surface-variant">Right</span>
          </div>
        </Section>

        {/* ── StatusIndicator ───────────────────────────────────── */}
        <Section title="StatusIndicator">
          <div className="flex items-stretch gap-6">
            <div className="flex items-center gap-2">
              <StatusIndicator status="available" orientation="vertical" className="h-10" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator status="booked" orientation="vertical" className="h-10" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator status="pending" orientation="vertical" className="h-10" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator status="error" orientation="vertical" className="h-10" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Error</span>
            </div>
          </div>
          <div className="flex max-w-sm flex-col gap-3">
            <StatusIndicator status="available" orientation="horizontal" />
            <StatusIndicator status="booked" orientation="horizontal" />
            <StatusIndicator status="pending" orientation="horizontal" />
          </div>
        </Section>

        {/* ── Card ──────────────────────────────────────────────── */}
        <Section title="Card">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Lab 402</CardTitle>
                <CardDescription>Engineering Block B — 45 seats</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-on-surface-variant">
                  Equipped with 4K projector, spatial audio, fiber uplink, and 20
                  Linux workstations. Ideal for technical workshops.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full uppercase tracking-widest text-xs">
                  Book Space
                </Button>
              </CardFooter>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Studio 12</CardTitle>
                <CardDescription>Creative Arts Wing — 12 seats</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-on-surface-variant">
                  Acoustic-paneled recording studio with multi-track interface
                  and isolation booth.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full uppercase tracking-widest text-xs">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* ── MetricCard ────────────────────────────────────────── */}
        <Section title="MetricCard">
          <div className="grid gap-6 md:grid-cols-3">
            <MetricCard stripe="available">
              <MetricLabel>Total Hours</MetricLabel>
              <MetricValue>24.5</MetricValue>
            </MetricCard>
            <MetricCard stripe="pending">
              <MetricLabel>Pending</MetricLabel>
              <MetricValue>02</MetricValue>
            </MetricCard>
            <MetricCard stripe="booked">
              <MetricLabel>Credits Used</MetricLabel>
              <MetricValue>88%</MetricValue>
            </MetricCard>
          </div>
        </Section>

        {/* ── Table ─────────────────────────────────────────────── */}
        <Section title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold">Lab 402</TableCell>
                <TableCell>Engineering Block B</TableCell>
                <TableCell>45</TableCell>
                <TableCell><Badge variant="available" dot>Available</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">Studio 12</TableCell>
                <TableCell>Creative Arts Wing</TableCell>
                <TableCell>12</TableCell>
                <TableCell><Badge variant="pending" dot>Pending</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">Seminar 08</TableCell>
                <TableCell>Business School</TableCell>
                <TableCell>20</TableCell>
                <TableCell><Badge variant="booked" dot>Booked</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        {/* ── DOMAIN: BookingRow ─────────────────────────────────── */}
        <Section title="BookingRow">
          <div className="flex flex-col overflow-hidden rounded-sm bg-surface-container">
            <BookingRow
              roomName="Lab 402"
              building="Engineering Block B"
              date="Oct 24, 2024"
              timeRange="14:00 — 16:30"
              status="confirmed"
              onAction={() => {}}
            />
            <div className="h-1.5 bg-surface-container" />
            <BookingRow
              roomName="Studio 12"
              building="Creative Arts Wing"
              date="Oct 26, 2024"
              timeRange="09:00 — 11:00"
              status="pending"
              onCancel={() => {}}
            />
            <div className="h-1.5 bg-surface-container" />
            <BookingRow
              roomName="Lecture Hall A"
              building="Main Quad"
              date="Oct 28, 2024"
              timeRange="13:00 — 15:00"
              status="confirmed"
              onAction={() => {}}
            />
            <div className="h-1.5 bg-surface-container" />
            <BookingRow
              roomName="Meeting R. 04"
              building="Business School"
              date="Nov 01, 2024"
              timeRange="10:00 — 12:00"
              status="pending"
              onCancel={() => {}}
            />
          </div>
        </Section>

        {/* ── DOMAIN: RoomCard ──────────────────────────────────── */}
        <Section title="RoomCard">
          <div className="flex flex-col gap-4">
            <RoomCard
              roomName="LAB_402B"
              available
              availabilityLabel="AVAILABLE NOW"
              capacity={45}
              equipment={[
                { icon: IconDeviceTv, label: "Multi-Media" },
              ]}
              timeRange="09:00 — 18:00"
              onBook={() => {}}
            />
            <RoomCard
              roomName="AUD_01"
              available
              availabilityLabel="AVAILABLE NOW"
              capacity={150}
              equipment={[
                { icon: IconCast, label: "Full Broadcast" },
              ]}
              timeRange="10:30 — 12:00"
              onBook={() => {}}
            />
            <RoomCard
              roomName="SEM_12"
              available={false}
              availabilityLabel="BOOKED UNTIL 16:00"
              capacity={20}
              equipment={[
                { icon: IconChalkboard, label: "Analog Board" },
              ]}
            />
            <RoomCard
              roomName="STUDIO_04"
              available
              availabilityLabel="AVAILABLE NOW"
              capacity={12}
              equipment={[
                { icon: IconMicrophone, label: "Acoustic Panel" },
              ]}
              timeRange="08:00 — 22:00"
              onBook={() => {}}
            />
          </div>
        </Section>

        {/* ── DOMAIN: TimeGrid ──────────────────────────────────── */}
        <Section title="TimeGrid">
          <TimeGrid
            title="Daily Occupancy"
            subtitle="Today: Oct 24, 2024"
            slots={timeSlots}
          />
        </Section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low px-6 py-10 text-center md:px-12">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Brutalist Concierge — 15 components — Dark Only — OKLCH Tokens
        </p>
      </footer>
    </div>