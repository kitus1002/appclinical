"use client";

import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { format } from "date-fns";

interface CalendarProps {
  events: any[];
  onEventChange: (info: any) => void;
  onEventClick: (info: any) => void;
}

export default function CalendarComponent({ events, onEventChange, onEventClick }: CalendarProps) {
  const [mounted, setMounted] = useState(false);
  const calendarRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[700px] bg-secondary/obj-5 animate-pulse rounded-3xl" />;

  return (
    <div className="p-4 bg-transparent min-h-[700px]">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridDay"
        headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek'
        }}
        locale={esLocale}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        events={events}
        eventDrop={onEventChange}
        eventResize={onEventChange}
        eventClick={onEventClick}
        height="700px" // Fixed height for consistency
        allDaySlot={false}
        slotDuration="00:15:00"
        eventTextColor="#fff"
        nowIndicator={true}
        eventClassNames="rounded-lg shadow-sm font-medium border-0 px-2 py-1 cursor-pointer transition-transform hover:scale-[1.02]"
      />
    </div>
  );
}
