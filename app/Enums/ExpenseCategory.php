<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case Supplies = 'supplies';
    case Utilities = 'utilities';
    case Rent = 'rent';
    case Other = 'other';
}
