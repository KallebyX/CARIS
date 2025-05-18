from datetime import datetime

def format_date(date_obj, format_str='%d/%m/%Y'):
    """Format date object to string."""
    if isinstance(date_obj, datetime):
        return date_obj.strftime(format_str)
    return date_obj

def get_time_of_day_greeting():
    """Return greeting based on time of day."""
    hour = datetime.now().hour
    
    if 5 <= hour < 12:
        return "Bom dia"
    elif 12 <= hour < 18:
        return "Boa tarde"
    else:
        return "Boa noite"

def get_date_range_description(start_date, end_date):
    """Get human-readable description of date range."""
    if not start_date or not end_date:
        return "Todo o período"
    
    start = start_date if isinstance(start_date, datetime) else datetime.strptime(start_date, '%Y-%m-%d')
    end = end_date if isinstance(end_date, datetime) else datetime.strptime(end_date, '%Y-%m-%d')
    
    if start.year == end.year and start.month == end.month:
        if start.day == end.day:
            return f"{start.day} de {start.strftime('%B')} de {start.year}"
        return f"{start.day} a {end.day} de {start.strftime('%B')} de {start.year}"
    
    if start.year == end.year:
        return f"{start.day} de {start.strftime('%B')} a {end.day} de {end.strftime('%B')} de {start.year}"
    
    return f"{start.day}/{start.month}/{start.year} a {end.day}/{end.month}/{end.year}"
