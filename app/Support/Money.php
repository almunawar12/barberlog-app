<?php

namespace App\Support;

final class Money
{
    /** Largest amount per record, safe for JavaScript numbers and the DB CHECK constraints. */
    public const MAX_AMOUNT = 999_999_999;
}
